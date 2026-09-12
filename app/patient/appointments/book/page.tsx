import { createClient } from "@/lib/supabase/server";
import { isConsultMode } from "@/lib/consult-mode";
import { isMissingSchemaError } from "@/lib/supabase/schema-fallback";
import { BookingForm } from "./booking-form";

type DoctorRow = {
  doctor_id: number;
  specialization: string | null;
  supports_teleconsult: boolean;
  profiles: { full_name: string } | null;
};

export default async function BookAppointmentPage({
  searchParams,
}: {
  // ?mode=VoiceConsult|Teleconsult|InPerson - preselected when arriving
  // from the symptom checker's recommendation.
  searchParams: Promise<{ mode?: string }>;
}) {
  const { mode } = await searchParams;
  const supabase = await createClient();

  // Only administrator-verified doctors can be booked (migration 004).
  // Before that migration there's no verification column - list everyone.
  const verified = await supabase
    .from("doctors")
    .select("doctor_id, specialization, supports_teleconsult, profiles!inner(full_name, verification_status)")
    .eq("profiles.verification_status", "Verified");
  const doctors =
    verified.error && isMissingSchemaError(verified.error)
      ? (await supabase.from("doctors").select("doctor_id, specialization, supports_teleconsult, profiles(full_name)")).data
      : verified.data;

  const doctorOptions = ((doctors ?? []) as unknown as DoctorRow[]).map((d) => ({
    doctor_id: d.doctor_id,
    specialization: d.specialization,
    supports_teleconsult: d.supports_teleconsult,
    full_name: d.profiles?.full_name ?? "Doctor",
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
