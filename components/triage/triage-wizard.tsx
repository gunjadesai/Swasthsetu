"use client";

import { useActionState } from "react";
import Link from "next/link";
import { submitTriage, type TriageState } from "@/lib/actions/triage-actions";
import { SYMPTOM_OPTIONS } from "@/lib/triage";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { useLocale, useTranslation } from "@/lib/i18n/locale-context";
import { cn } from "@/lib/utils";

const initialState: TriageState = {};

const URGENCY_STYLES: Record<string, string> = {
  Low: "bg-success/10 text-success",
  Medium: "bg-marigold-500/15 text-marigold-600",
  High: "bg-danger/10 text-danger",
  Emergency: "bg-danger text-white",
};

// patientId is required for an ASHA-assisted triage (the ASHA picks
// which patient first); a self-triage page omits it and the server
// action resolves current_patient_id() itself.
export function TriageWizard({ patientId }: { patientId?: number }) {
  const [state, formAction, pending] = useActionState(submitTriage, initialState);
  const t = useTranslation();
  const locale = useLocale();

  if (state.result) {
    const { urgency_level, recommended_action, triageId } = state.result;
    return (
      <div className="max-w-xl rounded-lg border border-line bg-white p-6">
        <span
          className={cn(
            "inline-block rounded-full px-3 py-1 text-xs font-semibold",
            URGENCY_STYLES[urgency_level]
          )}
        >
          {urgency_level}
        </span>
        <p className="mt-3 text-base text-ink">
          {t(`triage.result.${recommended_action}` as never)}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          {recommended_action === "CallAmbulance" && (
            <Link href={`/patient/emergency?triageId=${triageId}`}>
              <Button variant="danger">{t("emergency.callAmbulance")}</Button>
            </Link>
          )}
          {(recommended_action === "VisitPHC" || recommended_action === "BookAppointment") && (
            <Link href="/patient/appointments/book">
              <Button>{t("nav.book")}</Button>
            </Link>
          )}
          {recommended_action === "Teleconsult" && (
            <Link href="/patient/appointments/book">
              <Button>{t("nav.book")}</Button>
            </Link>
          )}
          <Link href="/patient/dashboard">
            <Button variant="secondary">{t("nav.dashboard")}</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="max-w-xl space-y-5">
      {patientId && <input type="hidden" name="patientId" value={patientId} />}

      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm font-medium text-ink">
          {t("triage.subtitle")}
        </legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {SYMPTOM_OPTIONS.map((s) => (
            <label
              key={s.key}
              className="flex items-start gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm text-ink"
            >
              <input
                type="checkbox"
                name="symptoms"
                value={s.key}
                className="mt-0.5 h-4 w-4 accent-teal-600"
              />
              {locale === "hi" ? s.label_hi : s.label_en}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <Textarea name="notes" rows={3} placeholder="Anything else to add? (optional)" />
      </div>

      {state.error && (
        <p role="alert" className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? t("common.loading") : t("triage.submit")}
      </Button>
    </form>
  );
}
