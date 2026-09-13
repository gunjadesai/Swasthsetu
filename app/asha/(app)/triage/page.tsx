import { createClient } from "@/lib/supabase/server";
import { AshaTriagePicker } from "./patient-picker";

export default async function AshaTriagePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: asha } = await supabase
    .from("asha_workers")
    .select("asha_id")
    .eq("profile_id", user!.id)
    .single();

  const { data: patients } = await supabase
    .from("patients")
    .select("patient_id, profiles(full_name)")
    .eq("registered_by_asha_id", asha?.asha_id ?? -1);

  const patientRows = (patients ?? []).map((p) => ({
    patient_id: p.patient_id,
    full_name: (p.profiles as unknown as { full_name?: string } | null)?.full_name ?? "Patient",
  }));

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-ink">Assisted symptom check</h1>
      <p className="mt-1 text-sm text-ink/70">
        Pick a patient you've registered, then walk through their symptoms.
      </p>
      <div className="mt-6">
        <AshaTriagePicker patients={patientRows} />
      </div>
    </div>
  );
}
