import Link from "next/link";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export default async function DoctorAppointmentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: doctor } = await supabase
    .from("doctors")
    .select("doctor_id")
    .eq("profile_id", user!.id)
    .single();

  if (!doctor) {
    return <p className="text-ink/70">Setting up your doctor profile...</p>;
  }

  const { data: appointments } = await supabase
    .from("appointments")
    .select(
      "appointment_id, appointment_date, appointment_time, status, mode, patients(profiles(full_name))"
    )
    .eq("doctor_id", doctor.doctor_id)
    .order("appointment_date", { ascending: false })
    .order("appointment_time", { ascending: false });

  const t = await getDictionary();

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-semibold text-ink">{t("doctor.appointments.title")}</h1>

      {!appointments || appointments.length === 0 ? (
        <Card className="mt-6 flex flex-col items-center justify-center py-10 text-center">
          <p className="text-sm text-ink/70">{t("doctor.appointments.empty")}</p>
        </Card>
      ) : (
        <div className="mt-6 space-y-3">
          {appointments.map((appt) => {
            const patient = appt.patients as unknown as {
              profiles: { full_name: string } | null;
            } | null;
            return (
              <Link
                key={appt.appointment_id}
                href={`/doctor/appointments/${appt.appointment_id}`}
              >
                <Card className="flex items-center justify-between transition-colors hover:border-teal-500">
                  <div>
                    <p className="font-medium text-ink">
                      {patient?.profiles?.full_name ?? "Patient"}
                    </p>
                    <p className="text-sm text-ink/70">
                      {appt.mode === "Teleconsult" ? t("dashboard.videoConsult") : appt.mode === "VoiceConsult" ? t("dashboard.voiceConsult") : t("dashboard.inPerson")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-ink">
                      {format(new Date(appt.appointment_date), "d MMM yyyy")} -{" "}
                      {appt.appointment_time.slice(0, 5)}
                    </p>
                    <div className="mt-1">
                      <Badge>{appt.status}</Badge>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
