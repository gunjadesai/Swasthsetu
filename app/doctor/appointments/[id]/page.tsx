import { notFound } from "next/navigation";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TeleconsultRoom } from "@/components/teleconsult-room";
import { ConsultForm } from "./consult-form";

type PatientInfo = {
  date_of_birth: string | null;
  gender: string | null;
  blood_group: string | null;
  profiles: { full_name: string; phone_number: string | null } | null;
} | null;

type PrescriptionItem = {
  medicine_name: string;
  dosage: string | null;
  duration_days: number | null;
  instructions: string | null;
};

export default async function AppointmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const appointmentId = Number(id);

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

  const { data: appointment } = await supabase
    .from("appointments")
    .select(
      "appointment_id, appointment_date, appointment_time, status, mode, doctor_id, patient_id, patients(date_of_birth, gender, blood_group, profiles(full_name, phone_number))"
    )
    .eq("appointment_id", appointmentId)
    .single();

  if (!appointment || appointment.doctor_id !== doctor.doctor_id) {
    notFound();
  }

  const [{ data: hospitals }, { data: labs }, { data: labTests }] = await Promise.all([
    supabase.from("hospitals").select("hospital_id, name").order("name"),
    supabase.from("laboratories").select("lab_id, name").order("name"),
    supabase.from("lab_test_catalog").select("test_id, test_name").order("test_name"),
  ]);

  const patient = appointment.patients as unknown as PatientInfo;

  const { data: record } = await supabase
    .from("medical_records")
    .select(
      "diagnosis, symptoms, notes, prescriptions(prescription_items(medicine_name, dosage, duration_days, instructions))"
    )
    .eq("appointment_id", appointment.appointment_id)
    .maybeSingle();

  const items: PrescriptionItem[] =
    (
      record?.prescriptions as unknown as {
        prescription_items: PrescriptionItem[];
      }[]
    )?.[0]?.prescription_items ?? [];

  return (
    <div className="max-w-2xl">
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-semibold text-ink">
              {patient?.profiles?.full_name ?? "Patient"}
            </p>
            <p className="text-sm text-ink/60">
              {patient?.gender ?? "Unknown gender"}
              {patient?.date_of_birth
                ? ` · Born ${format(new Date(patient.date_of_birth), "d MMM yyyy")}`
                : ""}
              {patient?.blood_group ? ` · ${patient.blood_group}` : ""}
            </p>
            {patient?.profiles?.phone_number && (
              <p className="text-sm text-ink/60">
                {patient.profiles.phone_number}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-sm text-ink">
              {format(new Date(appointment.appointment_date), "d MMM yyyy")} -{" "}
              {appointment.appointment_time.slice(0, 5)}
            </p>
            <div className="mt-1">
              <Badge>{appointment.status}</Badge>
            </div>
          </div>
        </div>
      </Card>

      {appointment.status === "Completed" ? (
        <Card className="mt-6">
          <p className="text-sm font-medium text-ink">Consultation record</p>
          {record?.diagnosis && (
            <p className="mt-2 text-sm text-ink">
              <span className="font-medium">Diagnosis: </span>
              {record.diagnosis}
            </p>
          )}
          {record?.symptoms && (
            <p className="mt-1 text-sm text-ink/70">
              <span className="font-medium">Symptoms: </span>
              {record.symptoms}
            </p>
          )}
          {record?.notes && (
            <p className="mt-1 text-sm text-ink/70">{record.notes}</p>
          )}
          {items.length > 0 && (
            <div className="mt-3">
              <p className="text-sm font-medium text-ink">Prescription</p>
              <ul className="mt-1.5 space-y-1">
                {items.map((item, i) => (
                  <li key={i} className="text-sm text-ink/70">
                    {item.medicine_name}
                    {item.dosage ? ` - ${item.dosage}` : ""}
                    {item.duration_days ? ` for ${item.duration_days} days` : ""}
                    {item.instructions ? ` (${item.instructions})` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      ) : appointment.status === "Scheduled" ? (
        <>
          {appointment.mode === "Teleconsult" && (
            <div className="mt-6">
              <TeleconsultRoom appointmentId={appointment.appointment_id} />
            </div>
          )}
          <ConsultForm
            appointmentId={appointment.appointment_id}
            hospitals={hospitals ?? []}
            labs={labs ?? []}
            labTests={labTests ?? []}
          />
        </>
      ) : (
        <p className="mt-6 text-sm text-ink/60">
          This appointment was {appointment.status.toLowerCase()}.
        </p>
      )}
    </div>
  );
}
