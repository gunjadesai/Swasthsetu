import { TriageWizard } from "@/components/triage/triage-wizard";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export default async function PatientTriagePage() {
  const t = await getDictionary();

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-ink">{t("triage.title")}</h1>
      <p className="mt-1 text-sm text-ink/60">{t("triage.subtitle")}</p>
      <div className="mt-6">
        <TriageWizard />
      </div>
    </div>
  );
}
