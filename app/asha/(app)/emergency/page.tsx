import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { EmergencyForm } from "@/components/emergency/emergency-form";
import { TriageEmergencySummary } from "@/components/emergency/triage-summary";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/input";

// ASHA-side emergency page. The assisted symptom checker redirects here
// with ?triageId=&patientId= when it finds an emergency; an ASHA can also
// open it directly and pick the patient.
export default async function AshaEmergencyPage({
  searchParams,
}: {
  searchParams: Promise<{ triageId?: string; patientId?: string }>;
}) {
  const params = await searchParams;
  const triageId = Number(params.triageId) || null;
  const patientId = Number(params.patientId) || null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const t = await getDictionary();

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
  const selected = patientRows.find((p) => p.patient_id === patientId) ?? null;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-danger">{t("emergency.title")}</h1>
      {triageId && <TriageEmergencySummary triageId={triageId} />}

      <form method="get" className="mt-6 flex max-w-md items-end gap-2">
        {triageId && <input type="hidden" name="triageId" value={triageId} />}
        <div className="flex-1">
          <Label htmlFor="patientId">{t("emergency.choosePatient")}</Label>
          <Select id="patientId" name="patientId" defaultValue={selected?.patient_id ?? ""}>
            <option value="">-</option>
            {patientRows.map((p) => (
              <option key={p.patient_id} value={p.patient_id}>
                {p.full_name}
              </option>
            ))}
          </Select>
        </div>
        <Button type="submit" variant="secondary">
          {t("common.submit")}
        </Button>
      </form>

      {selected && (
        <div className="mt-6">
          <p className="mb-3 text-sm text-ink/70">
            <strong>{selected.full_name}</strong>
          </p>
          <EmergencyForm key={selected.patient_id} triageId={triageId} patientId={selected.patient_id} />
        </div>
      )}
    </div>
  );
}
