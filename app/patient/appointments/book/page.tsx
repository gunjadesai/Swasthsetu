import { createClient } from "@/lib/supabase/server";
import { BookingForm } from "./booking-form";

export default async function BookAppointmentPage() {
  const supabase = await createClient();
  const { data: doctors } = await supabase
    .from("doctors")
    .select("doctor_id, specialization, profiles(full_name)");

  const doctorOptions = (doctors ?? []).map((d) => ({
    doctor_id: d.doctor_id,
    specialization: d.specialization,
    full_name:
      (d.profiles as unknown as { full_name: string } | null)?.full_name ??
      "Doctor",
  }));

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-ink">Book an appointment</h1>
      <p className="mt-1 text-sm text-ink/60">
        Pick a doctor, then a date to see open times.
      </p>
      {doctorOptions.length === 0 ? (
        <p className="mt-6 text-sm text-ink/60">
          No doctors have set up availability yet - check back soon.
        </p>
      ) : (
        <BookingForm doctors={doctorOptions} />
      )}
    </div>
  );
}
