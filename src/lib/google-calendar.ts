import "server-only";

import { randomBytes } from "crypto";

import { getBookingStatusKey } from "@/lib/booking-status";
import { getSiteUrl } from "@/lib/site-url";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";
const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";
const GOOGLE_CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
];
const REQUIRED_GOOGLE_CALENDAR_SCOPE =
  "https://www.googleapis.com/auth/calendar.events";

type BookingForCalendar = {
  id: string | number;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  clinic_name?: string | null;
  specialist_name?: string | null;
  treatment?: string | null;
  booking_date?: string | null;
  booking_time?: string | null;
  duration_minutes?: number | string | null;
  status?: string | null;
  google_calendar_event_id?: string | null;
};

type GoogleTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

export function hasGoogleCalendarConfig() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  );
}

function hasRequiredCalendarScope(scopes?: string[] | string | null) {
  const items = Array.isArray(scopes)
    ? scopes
    : typeof scopes === "string"
      ? scopes.split(" ")
      : [];

  return items.includes(REQUIRED_GOOGLE_CALENDAR_SCOPE);
}

function getRedirectUri() {
  return `${getSiteUrl()}/api/google-calendar/callback`;
}

function getTokenExpiresAt(expiresIn?: number) {
  const seconds = Number(expiresIn || 3600);
  return new Date(Date.now() + Math.max(seconds - 60, 60) * 1000).toISOString();
}

export async function createGoogleCalendarAuthUrl({
  specialistId,
  adminUserId,
}: {
  specialistId: string;
  adminUserId?: string | number | null;
}) {
  if (!hasGoogleCalendarConfig()) {
    return { ok: false as const, error: "missing_config" };
  }

  const state = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  await supabase.from("google_calendar_oauth_states").insert({
    state,
    specialist_id: specialistId,
    admin_user_id: adminUserId ? String(adminUserId) : null,
    expires_at: expiresAt,
  });

  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID || "");
  url.searchParams.set("redirect_uri", getRedirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GOOGLE_CALENDAR_SCOPES.join(" "));
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);

  return { ok: true as const, url: url.toString() };
}

async function exchangeCodeForTokens(code: string) {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      redirect_uri: getRedirectUri(),
      grant_type: "authorization_code",
    }),
  });

  const data = (await response.json()) as GoogleTokenResponse;

  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || "Google token error");
  }

  return data;
}

async function refreshGoogleAccessToken(refreshToken: string) {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = (await response.json()) as GoogleTokenResponse;

  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || "Google refresh error");
  }

  return data;
}

async function getGoogleEmail(accessToken: string) {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) return null;

  const data = (await response.json()) as { email?: string };
  return data.email || null;
}

export async function completeGoogleCalendarConnection({
  code,
  state,
}: {
  code: string;
  state: string;
}) {
  const { data: oauthState } = await supabase
    .from("google_calendar_oauth_states")
    .select("*")
    .eq("state", state)
    .gte("expires_at", new Date().toISOString())
    .maybeSingle();

  if (!oauthState) {
    throw new Error("Estado OAuth invalido o expirado");
  }

  const { data: specialist } = await supabase
    .from("specialists")
    .select("id,name")
    .eq("id", oauthState.specialist_id)
    .maybeSingle();

  if (!specialist) {
    throw new Error("Especialista no encontrado");
  }

  const tokens = await exchangeCodeForTokens(code);

  if (!hasRequiredCalendarScope(tokens.scope || GOOGLE_CALENDAR_SCOPES)) {
    throw new Error(
      "Google no concedio permisos de calendario. Reintenta aceptando el acceso a eventos."
    );
  }

  const googleEmail = await getGoogleEmail(tokens.access_token || "");

  const { error } = await supabase
    .from("specialist_google_calendar_connections")
    .upsert(
      {
        specialist_id: specialist.id,
        specialist_name: specialist.name,
        google_email: googleEmail,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: getTokenExpiresAt(tokens.expires_in),
        scopes: tokens.scope ? tokens.scope.split(" ") : GOOGLE_CALENDAR_SCOPES,
        status: "connected",
        connected_by_admin_id: oauthState.admin_user_id,
        connected_at: new Date().toISOString(),
        disconnected_at: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "specialist_id" }
    );

  await supabase.from("google_calendar_oauth_states").delete().eq("state", state);

  if (error) {
    throw new Error(error.message);
  }

  return specialist;
}

export async function getGoogleCalendarConnectionBySpecialistId(
  specialistId?: string | number | null
) {
  if (!specialistId) return null;

  const { data } = await supabase
    .from("specialist_google_calendar_connections")
    .select("specialist_id,specialist_name,google_email,status,scopes,connected_at,updated_at")
    .eq("specialist_id", specialistId)
    .maybeSingle();

  if (!data) return null;

  return {
    ...data,
    requires_reconnect: !hasRequiredCalendarScope(data.scopes),
  };
}

async function getActiveConnectionForSpecialistName(specialistName?: string | null) {
  if (!specialistName || !hasGoogleCalendarConfig()) return null;

  const { data: specialist } = await supabase
    .from("specialists")
    .select("id,name")
    .eq("name", specialistName)
    .maybeSingle();

  if (!specialist) return null;

  const { data: connection } = await supabase
    .from("specialist_google_calendar_connections")
    .select("*")
    .eq("specialist_id", specialist.id)
    .eq("status", "connected")
    .maybeSingle();

  return connection || null;
}

async function getValidAccessToken(connection: {
  id: string;
  access_token?: string | null;
  refresh_token?: string | null;
  token_expires_at?: string | null;
}) {
  const expiresAt = connection.token_expires_at
    ? new Date(connection.token_expires_at).getTime()
    : 0;

  if (connection.access_token && expiresAt > Date.now() + 60 * 1000) {
    return connection.access_token;
  }

  if (!connection.refresh_token) {
    throw new Error("La conexion no tiene refresh token");
  }

  const tokens = await refreshGoogleAccessToken(connection.refresh_token);

  await supabase
    .from("specialist_google_calendar_connections")
    .update({
      access_token: tokens.access_token,
      token_expires_at: getTokenExpiresAt(tokens.expires_in),
      updated_at: new Date().toISOString(),
    })
    .eq("id", connection.id);

  return tokens.access_token || "";
}

function normalizeDate(value?: string | null) {
  if (!value) return "";
  if (value.includes("T")) return value.split("T")[0];
  if (value.includes(" ")) return value.split(" ")[0];
  return value.slice(0, 10);
}

function normalizeTime(booking: BookingForCalendar) {
  return (
    booking.booking_time?.slice(0, 5) ||
    booking.booking_date?.slice(11, 16) ||
    "09:00"
  );
}

function addMinutes(time: string, minutes: number) {
  const [hours, mins] = time.split(":").map(Number);
  const total = hours * 60 + mins + minutes;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function buildEventPayload(booking: BookingForCalendar) {
  const date = normalizeDate(booking.booking_date);
  const startTime = normalizeTime(booking);
  const duration = Number(booking.duration_minutes || 60) || 60;
  const endTime = addMinutes(startTime, duration);

  return {
    summary: `${booking.treatment || "Consulta"} - ${booking.full_name || "Paciente"}`,
    description: [
      `Paciente: ${booking.full_name || "No registrado"}`,
      booking.email ? `Email: ${booking.email}` : null,
      booking.phone ? `Telefono: ${booking.phone}` : null,
      `Clinica: ${booking.clinic_name || "No registrada"}`,
      `Especialista: ${booking.specialist_name || "No registrado"}`,
      `Estado: ${booking.status || "No registrado"}`,
      `Reserva #${booking.id}`,
    ]
      .filter(Boolean)
      .join("\n"),
    start: {
      dateTime: `${date}T${startTime}:00`,
      timeZone: "Europe/Madrid",
    },
    end: {
      dateTime: `${date}T${endTime}:00`,
      timeZone: "Europe/Madrid",
    },
    attendees: booking.email ? [{ email: booking.email }] : undefined,
  };
}

async function updateBookingGoogleStatus(
  bookingId: string | number,
  payload: {
    eventId?: string | null;
    status: string;
    error?: string | null;
  }
) {
  await supabase
    .from("bookings")
    .update({
      google_calendar_event_id: payload.eventId,
      google_calendar_sync_status: payload.status,
      google_calendar_synced_at:
        payload.status === "synced" || payload.status === "cancelled"
          ? new Date().toISOString()
          : null,
      google_calendar_last_error: payload.error || null,
    })
    .eq("id", bookingId);
}

export async function syncBookingToGoogleCalendar(booking: BookingForCalendar) {
  const connection = await getActiveConnectionForSpecialistName(
    booking.specialist_name
  );

  if (!connection) return { skipped: true };

  if (!hasRequiredCalendarScope(connection.scopes)) {
    await updateBookingGoogleStatus(booking.id, {
      eventId: booking.google_calendar_event_id || null,
      status: "error",
      error:
        "La agenda debe reconectarse para conceder permisos de Google Calendar.",
    });

    return { error: new Error("Google Calendar requiere reconexion") };
  }

  try {
    const accessToken = await getValidAccessToken(connection);
    const calendarId = encodeURIComponent(connection.calendar_id || "primary");
    const statusKey = getBookingStatusKey(booking.status || "");
    const shouldCancel = ["cancelled", "no_show", "expired"].includes(statusKey);

    if (shouldCancel && booking.google_calendar_event_id) {
      await fetch(
        `${GOOGLE_CALENDAR_API}/calendars/${calendarId}/events/${encodeURIComponent(
          booking.google_calendar_event_id
        )}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      await updateBookingGoogleStatus(booking.id, {
        eventId: null,
        status: "cancelled",
      });

      return { cancelled: true };
    }

    if (shouldCancel) return { skipped: true };

    const eventPayload = buildEventPayload(booking);
    const eventId = booking.google_calendar_event_id;
    const url = eventId
      ? `${GOOGLE_CALENDAR_API}/calendars/${calendarId}/events/${encodeURIComponent(eventId)}`
      : `${GOOGLE_CALENDAR_API}/calendars/${calendarId}/events`;
    const response = await fetch(url, {
      method: eventId ? "PATCH" : "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(eventPayload),
    });

    const data = (await response.json().catch(() => ({}))) as { id?: string; error?: { message?: string } };

    if (!response.ok || !data.id) {
      throw new Error(data.error?.message || "No se pudo sincronizar Google Calendar");
    }

    await updateBookingGoogleStatus(booking.id, {
      eventId: data.id,
      status: "synced",
    });

    return { synced: true, eventId: data.id };
  } catch (error) {
    await updateBookingGoogleStatus(booking.id, {
      eventId: booking.google_calendar_event_id || null,
      status: "error",
      error: error instanceof Error ? error.message : "Google Calendar error",
    });

    return { error };
  }
}
