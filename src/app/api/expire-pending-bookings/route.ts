import { NextResponse } from "next/server";

import {
  expirePendingBooking,
  pendingConfirmationStatuses,
} from "@/lib/booking-lifecycle";
import { isScheduledTaskAuthorized } from "@/lib/scheduled-task-auth";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

async function handleExpiration(req: Request) {
  if (!(await isScheduledTaskAuthorized(req))) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date().toISOString();
  const { data: bookings, error } = await supabase
    .from("bookings")
    .select("id,full_name,specialist_name")
    .in("status", pendingConfirmationStatuses)
    .lte("confirmation_expires_at", now);

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  let expired = 0;

  for (const booking of bookings || []) {
    if (await expirePendingBooking(booking)) expired++;
  }

  return NextResponse.json({ success: true, checked: bookings?.length || 0, expired });
}

export async function GET(req: Request) {
  return handleExpiration(req);
}

export async function POST(req: Request) {
  return handleExpiration(req);
}
