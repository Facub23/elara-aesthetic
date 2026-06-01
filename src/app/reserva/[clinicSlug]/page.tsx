"use client";

import { useEffect, useState } from "react";
import { BookingModal } from "@/components/modals/booking-modal";
import { supabase } from "@/lib/supabase";
import { Navbar } from "@/components/layout/navbar";
import { getTreatmentName } from "@/lib/treatment-utils";

export default function ClinicPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const [clinic, setClinic] = useState<any>(null);
  const [specialists, setSpecialists] = useState<any[]>([]);
  const [treatments, setTreatments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    async function loadClinicData() {
      const { data: clinicData } = await supabase
        .from("clinics")
        .select("*")
        .eq("slug", slug)
        .single();

      if (!clinicData) return;

      const { data: specialistsData } = await supabase
        .from("specialists")
        .select("*")
        .eq("clinic_name", clinicData.name)
        .order("name", { ascending: true });

      const treatmentNames = new Set<string>();

      (specialistsData || []).forEach((specialist) => {
        if (!Array.isArray(specialist.treatments)) {
          return;
        }

        specialist.treatments.forEach((treatment: string | { name?: string | null }) => {
          const name = getTreatmentName(treatment);

          if (name) {
            treatmentNames.add(name);
          }
        });
      });

      setClinic(clinicData);
      setSpecialists(specialistsData || []);
      setTreatments(Array.from(treatmentNames).map((name) => ({ name })));
      setLoading(false);
    }

    loadClinicData();
  }, [slug]);

  if (loading) return <div>Cargando clínica...</div>;
  if (!clinic) return <div>Clínica no encontrada</div>;

  return (
    <main className="min-h-screen bg-[#F6F3EE] text-black">
      <Navbar />

      <div className="mx-auto max-w-7xl px-6 py-10">
        <h1 className="text-5xl font-bold">{clinic.name}</h1>
        <p className="mt-4 text-lg text-neutral-600">{clinic.description}</p>

        <button
          onClick={() => setModalOpen(true)}
          className="mt-8 rounded-full bg-black px-8 py-4 text-white text-lg hover:scale-[1.02] transition-all"
        >
          Reservar cita
        </button>
      </div>

      <BookingModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        clinicName={clinic.name}
        specialistName={specialists?.[0]?.name || ""}
        treatments={treatments.map((t) => t.name)}
        bookingSource="clinic_booking_page"
      />
    </main>
  );
}
