import { EmergencyForm } from "@/components/emergency/emergency-form";
import { TriageEmergencySummary } from "@/components/emergency/triage-summary";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export default async function EmergencyPage({
  searchParams,
}: {
  searchParams: Promise<{ triageId?: string }>;
}) {
  const { triageId: triageIdParam } = await searchParams;
  const triageId = Number(triageIdParam) || null;
  const t = await getDictionary();

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-danger">{t("emergency.title")}</h1>
      {triageId && <TriageEmergencySummary triageId={triageId} />}
      <div className="mt-6">
        <EmergencyForm triageId={triageId} />
      </div>
    </div>
  );
}
