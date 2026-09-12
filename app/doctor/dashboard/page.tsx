import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getDictionary, getLocale } from "@/lib/i18n/get-dictionary";

export default async function DoctorDashboardPage() {
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

  const today = new Date().toISOString().slice(0, 10);

  const [{ data: todayAppts }, { count: totalCount }, { count: completedCount }] =
    await Promise.all([
      supabase
        .from("appointments")
        .select(
          "appointment_id, appointment_time, status, mode, patients(patients_id:patient_id, profiles(full_name))"
        )
        .eq("doctor_id", doctor.doctor_id)
        .eq("appointment_date", today)
        .order("appointment_time", { ascending: true }),
      supabase
        .from("appointments")
        .select("appointment_id", { count: "exact", head: true })
        .eq("doctor_id", doctor.doctor_id),
      supabase
        .from("appointments")
        .select("appointment_id", { count: "exact", head: true })
        .eq("doctor_id", doctor.doctor_id)
        .eq("status", "Completed"),
    ]);

  const t = await getDictionary();
  const locale = await getLocale();
  const todayLocale = locale === "hi" ? "hi-IN" : locale === "gu" ? "gu-IN" : "en-IN";

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-semibold text-ink">{t("dashboard.overview")}</h1>
      <p className="mt-1 text-sm text-ink/60">
        {new Date().toLocaleDateString(todayLocale, { weekday: "long", day: "numeric", month: "long" })}
      </p>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <Card>
          <p className="text-3xl font-semibold text-teal-600">
            {todayAppts?.length ?? 0}
          </p>
          <p className="mt-1 text-sm text-ink/60">{t("dashboard.appointmentsToday")}</p>
        </Card>
        <Card>
          <p className="text-3xl font-semibold text-teal-600">{totalCount ?? 0}</p>
          <p className="mt-1 text-sm text-ink/60">{t("dashboard.totalAppointments")}</p>
        </Card>
        <Card>
          <p className="text-3xl font-semibold text-teal-600">
            {completedCount ?? 0}
          </p>
          <p className="mt-1 text-sm text-ink/60">{t("dashboard.completedConsultations")}</p>
        </Card>
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-ink">
          {t("dashboard.todaysSchedule")}
        </h2>

        {todayAppts && todayAppts.length > 0 ? (
          <div className="space-y-3">
            {todayAppts.map((appt) => {
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
                      <p className="text-sm text-ink/60">
                        {appt.mode === "Teleconsult" ? t("dashboard.videoConsult") : t("dashboard.inPerson")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-ink">
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
        ) : (
          <Card className="flex flex-col items-center justify-center py-10 text-center">
            <CalendarClock className="h-8 w-8 text-ink/30" />
            <p className="mt-3 text-sm text-ink/60">
              {t("dashboard.nothingOnSchedule")}
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
