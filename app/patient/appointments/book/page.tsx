import { createClient } from "@/lib/supabase/server";
import { isConsultMode } from "@/lib/consult-mode";
import { BookingForm } from "./booking-form";

export default async function BookAppointmentPage({
  searchParams,
}: {
  // ?mode=VoiceConsult|Teleconsult|InPerson - preselected when arriving
  // from the symptom checker's recommendation.
  searchParams: Promise<{ mode?: string }>;
}) {
  const { mode } = await searchParams;
  const supabase = await createClient();
  const { data: doctors } = await supabase
    .from("doctors")
    .select("doctor_id, specialization, supports_teleconsult, profiles(full_name)");

  const doctorOptions = (doctors ?? []).map((d) => ({
    doctor_id: d.doctor_id,
    specialization: d.specialization,
    supports_teleconsult: d.supports_teleconsult,
    full_name:
      (d.profiles as unknown as { full_name: string } | null)?.full_name ??
      "Doctor",
  }));

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-ink">Book an appointment</h1>
      <p className="mt-1 text-sm text-ink/70">
        Choose how you want to see the doctor, then pick a doctor and a date to see open times.
      </p>
      {doctorOptions.length === 0 ? (
        <p className="mt-6 text-sm text-ink/70">
          No doctors have set up availability yet - check back soon.
        </p>
      ) : (
        <BookingForm doctors={doctorOptions} initialMode={isConsultMode(mode) ? mode : "InPerson"} />
      )}
    </div>
  );
}
