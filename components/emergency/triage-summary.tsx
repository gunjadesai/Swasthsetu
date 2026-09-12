import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { decryptPHIJson } from "@/lib/phi-crypto";
import type { AiTriageAssessment } from "@/lib/ai-triage";

// Shown on the emergency page when the symptom checker redirected here:
// why it was flagged, and what to do while the ambulance is coming.
// RLS limits the read to the patient, the ASHA who ran it, or a doctor.
export async function TriageEmergencySummary({ triageId }: { triageId: number }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("triage_assessments")
    .select("urgency_level, ai_assessment")
    .eq("triage_id", triageId)
    .maybeSingle();
  if (!data) return null;

  const t = await getDictionary();
  const ai = decryptPHIJson<AiTriageAssessment>(data.ai_assessment);

  return (
    <div role="alert" className="mt-4 max-w-md rounded-lg border border-danger/40 bg-danger/5 p-4">
      <p className="font-semibold text-danger">{t("emergency.flagged")}</p>
      {ai?.summary && <p className="mt-1 text-sm text-ink">{ai.summary}</p>}
      {ai && ai.self_care_advice.length > 0 && (
        <>
          <p className="mt-3 text-sm font-medium text-ink">{t("emergency.whileWaiting")}</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-ink/80">
            {ai.self_care_advice.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
