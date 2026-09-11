import Link from "next/link";
import { format } from "date-fns";
import { Calendar, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function PatientDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: patient } = await supabase
    .from("patients")
    .select("patient_id")
    .eq("profile_id", user!.id)
    .single();

  if (!patient) {
    return <p className="text-ink/70">Setting up your patient profile...</p>;
  }

  const today = new Date().toISOString().slice(0, 10);

  const [{ data: upcoming }, { count: totalCount }, { count: completedCount }] =
    await Promise.all([
      supabase
        .from("appointments")
        .select(
          "appointment_id, appointment_date, appointment_time, status, mode, doctors(specialization, profiles(full_name))"
        )
        .eq("patient_id", patient.patient_id)
        .eq("status", "Scheduled")
        .gte("appointment_date", today)
        .order("appointment_date", { ascending: true })
        .order("appointment_time", { ascending: true })
        .limit(3),
      supabase
        .from("appointments")
        .select("appointment_id", { count: "exact", head: true })
        .eq("patient_id", patient.patient_id),
      supabase
        .from("appointments")
        .select("appointment_id", { count: "exact", head: true })
        .eq("patient_id", patient.patient_id)
        .eq("status", "Completed"),
    ]);

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Overview</h1>
          <p className="mt-1 text-sm text-ink/60">
            Your appointments and health record, in one place.
          </p>
        </div>
        <Link href="/patient/appointments/book">
          <Button>Book an appointment</Button>
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <Link href="/patient/appointments">
          <Card className="transition-colors hover:border-teal-500">
            <p className="text-3xl font-semibold text-teal-600">
              {totalCount ?? 0}
            </p>
            <p className="mt-1 text-sm text-ink/60">Total appointments</p>
          </Card>
        </Link>
        <Link href="/patient/appointments?status=Completed">
          <Card className="transition-colors hover:border-teal-500">
            <p className="text-3xl font-semibold text-teal-600">
              {completedCount ?? 0}
            </p>
            <p className="mt-1 text-sm text-ink/60">Completed consultations</p>
          </Card>
        </Link>
      </div>

      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">
            Upcoming appointments
          </h2>
          <Link
            href="/patient/appointments"
            className="flex items-center gap-1 text-sm font-medium text-teal-600"
          >
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {upcoming && upcoming.length > 0 ? (
          <div className="space-y-3">
            {upcoming.map((appt) => {
              const doctor = appt.doctors as unknown as {
                specialization: string | null;
                profiles: { full_name: string } | null;
              } | null;
              return (
                <Card
                  key={appt.appointment_id}
                  className="flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-ink">
                      Dr. {doctor?.profiles?.full_name ?? "Unknown"}
                    </p>
                    <p className="text-sm text-ink/60">
                      {doctor?.specialization ?? "General"}
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
              );
            })}
          </div>
        ) : (
          <Card className="flex flex-col items-center justify-center py-10 text-center">
            <Calendar className="h-8 w-8 text-ink/30" />
            <p className="mt-3 text-sm text-ink/60">
              No upcoming appointments yet.
            </p>
            <Link href="/patient/appointments/book" className="mt-3">
              <Button size="sm">Book your first appointment</Button>
            </Link>
          </Card>
        )}
      </div>
    </div>
  );
}
