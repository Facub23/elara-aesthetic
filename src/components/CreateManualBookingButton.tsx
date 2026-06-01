"use client";

import { useState } from "react";

import { showAdminToast } from "@/components/AdminToast";
import { getTreatmentName } from "@/lib/treatment-utils";

export default function CreateManualBookingButton({
  clinics,
  specialists,
  treatments,
}: {
  clinics: any[];
  specialists: any[];
  treatments: any[];
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    clinic_name: "",
    specialist_name: "",
    full_name: "",
    email: "",
    booking_date: "",
    booking_time: "",
    treatment: "",
  });

  const filteredSpecialists = form.clinic_name
    ? specialists.filter(
        (specialist) => specialist.clinic_name === form.clinic_name
      )
    : specialists;

  const selectedSpecialist = specialists.find(
    (specialist) => specialist.name === form.specialist_name
  );
  const filteredTreatments =
    selectedSpecialist?.treatments?.length > 0
      ? selectedSpecialist.treatments.map((treatment: any) => ({
          id: getTreatmentName(treatment),
          name: getTreatmentName(treatment),
        }))
      : treatments;

  async function createBooking(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);

    const res = await fetch("/api/create-manual-booking", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    const data = await res.json();

    setLoading(false);

    if (!res.ok) {
      showAdminToast(
        data.error || "Error creando reserva",
        "error"
      );

      return;
    }

    showAdminToast(
      "Reserva creada correctamente",
      "success"
    );

    window.location.reload();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-full bg-black px-6 py-3 text-white transition-all duration-300 hover:scale-[1.03]"
      >
        Nueva reserva
      </button>

      {open && (
        <div className="fixed inset-0 z-[99999] overflow-y-auto bg-[#F6F3EE]">
          <div className="min-h-screen">
            <div className="sticky top-0 z-50 border-b border-black/5 bg-[#F6F3EE]/90 backdrop-blur-2xl">
              <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
                <div>
                  <div className="text-sm uppercase tracking-[0.3em] text-neutral-500">
                    EncuentraTuClinica CMS
                  </div>

                  <h2 className="mt-2 text-4xl font-semibold tracking-tight">
                    Nueva reserva
                  </h2>
                </div>

                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-full border border-black/10 bg-white px-6 py-3 text-sm"
                  >
                    Cancelar
                  </button>

                  <button
                    form="manual-booking-form"
                    type="submit"
                    disabled={loading}
                    className="rounded-full bg-black px-7 py-3 text-sm text-white disabled:opacity-50"
                  >
                    {loading ? "Creando..." : "Crear reserva"}
                  </button>
                </div>
              </div>
            </div>

            <form
              id="manual-booking-form"
              onSubmit={createBooking}
              className="mx-auto grid max-w-7xl gap-10 px-6 py-10 lg:grid-cols-[1.1fr_0.9fr]"
            >
              <div className="rounded-[40px] border border-black/5 bg-white/70 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.04)] backdrop-blur-2xl">
                <div className="text-sm uppercase tracking-[0.25em] text-neutral-500">
                  Información de reserva
                </div>

                <h3 className="mt-3 text-3xl font-semibold">
                  Datos del paciente
                </h3>

                <div className="mt-10 grid gap-5">
                  <input
                    placeholder="Nombre del paciente"
                    value={form.full_name}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        full_name: e.target.value,
                      })
                    }
                    className="h-14 rounded-[22px] border border-black/5 bg-[#F8F5F1] px-6 outline-none"
                  />

                  <input
                    placeholder="Email opcional"
                    value={form.email}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        email: e.target.value,
                      })
                    }
                    className="h-14 rounded-[22px] border border-black/5 bg-[#F8F5F1] px-6 outline-none"
                  />

                  <select
                    value={form.clinic_name}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        clinic_name: e.target.value,
                        specialist_name: "",
                        treatment: "",
                      })
                    }
                    className="h-14 rounded-[22px] border border-black/5 bg-[#F8F5F1] px-6 outline-none"
                  >
                    <option value="">Seleccionar clínica</option>

                    {clinics.map((clinic) => (
                      <option key={clinic.id} value={clinic.name}>
                        {clinic.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={form.specialist_name}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        specialist_name: e.target.value,
                        treatment: "",
                      })
                    }
                    className="h-14 rounded-[22px] border border-black/5 bg-[#F8F5F1] px-6 outline-none"
                  >
                    <option value="">Seleccionar especialista</option>

                    {filteredSpecialists.map((specialist) => (
                      <option key={specialist.id} value={specialist.name}>
                        {specialist.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={form.treatment}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        treatment: e.target.value,
                      })
                    }
                    className="h-14 rounded-[22px] border border-black/5 bg-[#F8F5F1] px-6 outline-none"
                  >
                    <option value="">Seleccionar tratamiento</option>

                    {filteredTreatments.map((treatment: any) => (
                      <option key={treatment.id || treatment.name} value={treatment.name}>
                        {treatment.name}
                      </option>
                    ))}
                  </select>

                  <div className="grid gap-5 md:grid-cols-2">
                    <input
                      type="date"
                      value={form.booking_date}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          booking_date: e.target.value,
                        })
                      }
                      className="h-14 rounded-[22px] border border-black/5 bg-[#F8F5F1] px-6 outline-none"
                    />

                    <select
                      value={form.booking_time}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          booking_time: e.target.value,
                        })
                      }
                      className="h-14 rounded-[22px] border border-black/5 bg-[#F8F5F1] px-6 outline-none"
                    >
                      <option value="">Hora</option>
                      <option value="08:00">08:00</option>
                      <option value="09:00">09:00</option>
                      <option value="10:00">10:00</option>
                      <option value="11:00">11:00</option>
                      <option value="12:00">12:00</option>
                      <option value="13:00">13:00</option>
                      <option value="14:00">14:00</option>
                      <option value="15:00">15:00</option>
                      <option value="16:00">16:00</option>
                      <option value="17:00">17:00</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="rounded-[40px] border border-black/5 bg-white/70 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.04)] backdrop-blur-2xl">
                <div className="text-sm uppercase tracking-[0.25em] text-neutral-500">
                  Preview
                </div>

                <div className="mt-8 space-y-5">
                  <div className="rounded-[28px] bg-[#F8F5F1] p-6">
                    <div className="text-sm text-neutral-500">
                      Paciente
                    </div>
                    <div className="mt-2 text-3xl font-semibold">
                      {form.full_name || "Paciente"}
                    </div>
                  </div>

                  <div className="rounded-[28px] bg-[#F8F5F1] p-6">
                    <div className="text-sm text-neutral-500">
                      Especialista
                    </div>
                    <div className="mt-2 text-2xl font-semibold">
                      {form.specialist_name || "Sin seleccionar"}
                    </div>
                  </div>

                  <div className="rounded-[28px] bg-[#F8F5F1] p-6">
                    <div className="text-sm text-neutral-500">
                      Fecha y hora
                    </div>
                    <div className="mt-2 text-2xl font-semibold">
                      {form.booking_date || "Fecha"}{" "}
                      {form.booking_time || "Hora"}
                    </div>
                  </div>

                  <div className="rounded-[28px] bg-black p-6 text-white">
                    <div className="text-sm uppercase tracking-[0.25em] text-white/60">
                      Estado
                    </div>
                    <div className="mt-2 text-3xl font-semibold">
                      Confirmada
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
