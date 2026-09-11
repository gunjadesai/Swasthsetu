import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Read-only, RLS-respecting FHIR R4-shaped export. This is NOT a
// certified ABDM/ABHA integration (that needs an org registration this
// prototype doesn't have) - it's an honest answer to "interoperable...
// based on approved standards": the shape a real health-information
// exchange would expect, built from data the signed-in user is already
// allowed to read. Uses the normal cookie-scoped client (not the
// service-role one), so a patient can only ever export their own
// record and a doctor only a patient they've treated - RLS decides
// that, not this route.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ patientId: string }> }
) {
  const { patientId: patientIdParam } = await params;
  const patientId = Number(patientIdParam);
  if (!patientId) {
    return NextResponse.json({ error: "Invalid patient id" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data: patient } = await supabase
    .from("patients")
    .select("patient_id, date_of_birth, gender, health_id_number, profiles(full_name, phone_number)")
    .eq("patient_id", patientId)
    .maybeSingle();

  if (!patient) {
    // Either it doesn't exist, or RLS silently filtered it out because
    // this user isn't allowed to see it - same response either way.
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [{ data: records }, { data: prescriptions }] = await Promise.all([
    supabase
      .from("medical_records")
      .select("record_id, diagnosis, symptoms, created_at")
      .eq("patient_id", patientId),
    supabase
      .from("prescriptions")
      .select("prescription_id, issued_date, prescription_items(medicine_name, dosage, duration_days, instructions)")
      .eq("patient_id", patientId),
  ]);

  const profile = patient.profiles as unknown as { full_name?: string; phone_number?: string } | null;

  const bundle = {
    resourceType: "Bundle",
    type: "collection",
    entry: [
      {
        resource: {
          resourceType: "Patient",
          id: String(patient.patient_id),
          identifier: patient.health_id_number
            ? [{ system: "https://healthid.ndhm.gov.in", value: patient.health_id_number }]
            : [],
          name: profile?.full_name ? [{ text: profile.full_name }] : [],
          telecom: profile?.phone_number ? [{ system: "phone", value: profile.phone_number }] : [],
          gender: patient.gender ?? undefined,
          birthDate: patient.date_of_birth ?? undefined,
        },
      },
      ...(records ?? []).map((r) => ({
        resource: {
          resourceType: "Condition",
          id: String(r.record_id),
          subject: { reference: `Patient/${patient.patient_id}` },
          code: r.diagnosis ? { text: r.diagnosis } : undefined,
          note: r.symptoms ? [{ text: r.symptoms }] : undefined,
          recordedDate: r.created_at,
        },
      })),
      ...(prescriptions ?? []).flatMap((p) =>
        (p.prescription_items ?? []).map((item, i) => ({
          resource: {
            resourceType: "MedicationRequest",
            id: `${p.prescription_id}-${i}`,
            status: "completed",
            intent: "order",
            subject: { reference: `Patient/${patient.patient_id}` },
            medicationCodeableConcept: { text: item.medicine_name },
            dosageInstruction: item.dosage || item.instructions
              ? [{ text: [item.dosage, item.instructions].filter(Boolean).join(" - ") }]
              : undefined,
            authoredOn: p.issued_date,
          },
        }))
      ),
    ],
  };

  return NextResponse.json(bundle);
}
