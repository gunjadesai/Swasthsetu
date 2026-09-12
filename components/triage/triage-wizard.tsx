"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ShieldCheck, Sparkles, Volume2 } from "lucide-react";
import { submitTriage, type TriageState } from "@/lib/actions/triage-actions";
import { SYMPTOM_OPTIONS, symptomLabel } from "@/lib/triage";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MicButton } from "@/components/voice/mic-button";
import { useLocale, useTranslation } from "@/lib/i18n/locale-context";
import { speak } from "@/lib/voice/use-speech";
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
// action resolves the signed-in patient itself.
export function TriageWizard({ patientId }: { patientId?: number }) {
  const [state, formAction, pending] = useActionState(submitTriage, initialState);
  const t = useTranslation();
  const locale = useLocale();
  const [description, setDescription] = useState("");
  const [usedVoice, setUsedVoice] = useState(false);
  const assisted = patientId !== undefined;

  function appendTranscript(text: string) {
    setUsedVoice(true);
    setDescription((prev) => (prev ? `${prev} ${text}` : text));
  }

  if (state.result) {
    const { urgency_level, recommended_action, engine, ai, aiUnavailable } = state.result;
    const urgencyText = t(`triage.urgency.${urgency_level}` as never);
    const actionText = t(`triage.result.${recommended_action}` as never);
    const spokenSummary = [urgencyText, ai?.summary, actionText, ...(ai?.self_care_advice ?? [])]
      .filter(Boolean)
      .join(". ");
    const engineKey =
      engine === "AI"
        ? "triage.engine.ai"
        : engine === "AI+Rules"
          ? "triage.engine.aiEscalated"
          : aiUnavailable
            ? "triage.engine.rulesFallback"
            : "triage.engine.rules";

    return (
      <div className="max-w-xl space-y-5 rounded-lg border border-line bg-white p-6">
        <div className="flex items-center justify-between gap-3">
          <span
            className={cn(
              "inline-block rounded-full px-3 py-1 text-xs font-semibold",
              URGENCY_STYLES[urgency_level]
            )}
          >
            {urgencyText}
          </span>
          <Button variant="ghost" size="sm" onClick={() => speak(spokenSummary, locale)}>
            <Volume2 className="h-4 w-4" />
            {t("voice.readAloud")}
          </Button>
        </div>

        <div>
          <p className="text-base font-medium text-ink">{actionText}</p>
          {ai?.summary && <p className="mt-1 text-sm text-ink/80">{ai.summary}</p>}
        </div>

        {ai && ai.possible_conditions.length > 0 && (
          <section>
            <h3 className="text-sm font-medium text-ink">{t("triage.possibleConditions")}</h3>
            <ul className="mt-1 space-y-0.5 text-sm text-ink/70">
              {ai.possible_conditions.map((c) => (
                <li key={c.name}>
                  {c.name} <span className="text-ink/40">({c.likelihood})</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {ai && ai.self_care_advice.length > 0 && (
          <section>
            <h3 className="text-sm font-medium text-ink">{t("triage.selfCare")}</h3>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-ink/70">
              {ai.self_care_advice.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </section>
        )}

        {ai && ai.red_flags_to_watch.length > 0 && (
          <section className="rounded-md bg-danger/5 p-3">
            <h3 className="text-sm font-medium text-danger">{t("triage.redFlags")}</h3>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-ink/80">
              {ai.red_flags_to_watch.map((flag) => (
                <li key={flag}>{flag}</li>
              ))}
            </ul>
          </section>
        )}

        <div className="space-y-1">
          <p className="flex items-center gap-1.5 text-xs text-ink/50">
            {engine === "Rules" ? <ShieldCheck className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
            {t(engineKey)}
          </p>
          <p className="text-xs text-ink/50">{t("triage.disclaimer")}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          {recommended_action === "CallAmbulance" && (
            <Link href={assisted ? `/asha/emergency?patientId=${patientId}` : "/patient/emergency"}>
              <Button variant="danger">{t("emergency.callAmbulance")}</Button>
            </Link>
          )}
          {!assisted && recommended_action === "VisitPHC" && (
            <Link href="/patient/appointments/book">
              <Button>{t("triage.bookInPerson")}</Button>
            </Link>
          )}
          {!assisted && (recommended_action === "BookAppointment" || recommended_action === "Teleconsult") && (
            <>
              <Link href="/patient/appointments/book?mode=VoiceConsult">
                <Button>{t("triage.bookVoice")}</Button>
              </Link>
              <Link href="/patient/appointments/book?mode=Teleconsult">
                <Button variant="secondary">{t("triage.bookVideo")}</Button>
              </Link>
              <Link href="/patient/appointments/book?mode=InPerson">
                <Button variant="secondary">{t("triage.bookInPerson")}</Button>
              </Link>
            </>
          )}
          <Link href={assisted ? "/asha/dashboard" : "/patient/dashboard"}>
            <Button variant="secondary">{t("nav.dashboard")}</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="max-w-xl space-y-5">
      {patientId && <input type="hidden" name="patientId" value={patientId} />}
      <input type="hidden" name="channel" value={usedVoice ? "Voice" : "Web"} />

      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm font-medium text-ink">{t("triage.subtitle")}</legend>
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
              {symptomLabel(s, locale)}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="description">{t("triage.describe")}</Label>
        <Textarea
          id="description"
          name="description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("triage.describePlaceholder")}
        />
        <MicButton onTranscript={appendTranscript} label={t("voice.describe")} />
      </div>

      {state.error && (
        <p role="alert" className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? t("triage.analysing") : t("triage.submit")}
      </Button>
    </form>
  );
}
