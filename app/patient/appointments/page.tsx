import Link from "next/link";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TeleconsultRoom } from "@/components/teleconsult-room";
import { consultModeLabel, isRemoteConsult } from "@/lib/consult-mode";
import { decryptPHI } from "@/lib/phi-crypto";
import { cn } from "@/lib/utils";
import { CancelAppointmentButton } from "./cancel-button";

type DoctorInfo = {
  specialization: string | null;
  profiles: { full_name: string } | null;
} | null;

type PrescriptionItem = {
  medicine_name: string;
  dosage: string | null;
  duration_days: number | null;
  instructions: string | null;
};

type RecordWithPrescription = {
  appointment_id: number | null;
  diagnosis: string | null;
  notes: string | null;
  prescriptions: { prescription_items: PrescriptionItem[] }[] | null;
};

const STATUS_TABS = ["All", "Scheduled", "Completed", "Cancelled"] as const;
type StatusTab = (typeof STATUS_TABS)[number];

export default async function PatientAppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: statusParam } = await searchParams;
  const activeTab: StatusTab = (
    STATUS_TABS as readonly string[]
  ).includes(statusParam ?? "")
    ? (statusParam as StatusTab)
    : "All";

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

  let appointmentsQuery = supabase
    .from("appointments")
    .select(
      "appointment_id, appointment_date, appointment_time, status, mode, doctors(specialization, profiles(full_name))"
    )
    .eq("patient_id", patient.patient_id)
    .order("appointment_date", { ascending: false })
    .order("appointment_time", { ascending: false });

  if (activeTab !== "All") {
    appointmentsQuery = appointmentsQuery.eq("status", activeTab);
  }

  const [{ data: appointments }, { data: records }] = await Promise.all([
    appointmentsQuery,
    supabase
      .from("medical_records")
      .select(
        "appointment_id, diagnosis, notes, prescriptions(prescription_items(medicine_name, dosage, duration_days, instructions))"
      )
      .eq("patient_id", patient.patient_id),
  ]);

  // Diagnosis and notes are stored encrypted (lib/phi-crypto.ts).
  const recordByAppointment = new Map<number, RecordWithPrescription>();
  (records ?? []).forEach((r) => {
    if (r.appointment_id) {
      recordByAppointment.set(r.appointment_id, {
        ...r,
        diagnosis: decryptPHI(r.diagnosis),
        notes: decryptPHI(r.notes),
      });
    }
  });

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">Appointments</h1>
        <Link href="/patient/appointments/book">
          <Button>Book an appointment</Button>
        </Link>
      </div>

      <div className="mt-4 flex gap-1 border-b border-line">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab}
            href={
              tab === "All"
                ? "/patient/appointments"
                : `/patient/appointments?status=${tab}`
            }
            className={cn(
              "px-3 py-2 text-sm font-medium",
              activeTab === tab
                ? "border-b-2 border-teal-600 text-teal-700"
                : "text-ink/70 hover:text-ink"
            )}
          >
            {tab === "Completed" ? "Completed consultations" : tab}
          </Link>
        ))}
      </div>

      {!appointments || appointments.length === 0 ? (
        <Card className="mt-6 flex flex-col items-center justify-center py-10 text-center">
          <p className="text-sm text-ink/70">
            {activeTab === "All"
              ? "No appointments yet."
              : `No ${activeTab.toLowerCase()} appointments.`}
          </p>
        </Card>
      ) : (
        <div className="mt-6 space-y-4">
          {appointments.map((appt) => {
            const doctor = appt.doctors as unknown as DoctorInfo;
            const record = recordByAppointment.get(appt.appointment_id);
            const items = record?.prescriptions?.[0]?.prescription_items ?? [];

            return (
              <Card key={appt.appointment_id}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-ink">
                      Dr. {doctor?.profiles?.full_name ?? "Unknown"}
                    </p>
                    <p className="text-sm text-ink/70">
                      {doctor?.specialization ?? "General"} ·{" "}
                      {consultModeLabel(appt.mode)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-ink">
                      {format(new Date(appt.appointment_date), "d MMM yyyy")} -{" "}
                      {appt.appointment_time.slice(0, 5)}
                    </p>
                    <div className="mt-1 flex items-center justify-end gap-2">
                      <Badge>{appt.status}</Badge>
                      {appt.status === "Scheduled" && (
                        <CancelAppointmentButton
                          appointmentId={appt.appointment_id}
                        />
                      )}
                    </div>
                  </div>
                </div>

                {appt.status === "Scheduled" && isRemoteConsult(appt.mode) && (
                  <div className="mt-4 border-t border-line pt-4">
                    <TeleconsultRoom
                      appointmentId={appt.appointment_id}
                      mode={appt.mode === "VoiceConsult" ? "voice" : "video"}
                    />
                  </div>
                )}

                {record && (
                  <div className="mt-4 border-t border-line pt-4">
                    {record.diagnosis && (
                      <p className="text-sm text-ink">
                        <span className="font-medium">Diagnosis: </span>
                        {record.diagnosis}
                      </p>
                    )}
                    {record.notes && (
                      <p className="mt-1 text-sm text-ink/70">{record.notes}</p>
                    )}
                    {items.length > 0 && (
                      <div className="mt-3">
                        <p className="text-sm font-medium text-ink">
                          Prescription
                        </p>
                        <ul className="mt-1.5 space-y-1">
                          {items.map((item, i) => (
                            <li key={i} className="text-sm text-ink/70">
                              {item.medicine_name}
                              {item.dosage ? ` - ${item.dosage}` : ""}
                              {item.duration_days
                                ? ` for ${item.duration_days} days`
                                : ""}
                              {item.instructions ? ` (${item.instructions})` : ""}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
