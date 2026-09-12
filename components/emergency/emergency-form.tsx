"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Phone, Siren } from "lucide-react";
import { requestAmbulance, type EmergencyState } from "@/lib/actions/emergency-actions";
import { Button } from "@/components/ui/button";
import { MicButton } from "@/components/voice/mic-button";
import { useLocale, useTranslation } from "@/lib/i18n/locale-context";
import { detectEmergencyPhrase } from "@/lib/triage";
import { speak } from "@/lib/voice/use-speech";

const initialState: EmergencyState = {};

// One-tap ambulance request plus a hands-free voice SOS: the mic keeps
// listening, and the moment it hears "help" / "bachao" / "ambulance" /
// an emergency symptom (en, hi, gu) the request goes out - no second tap,
// because the person may not be able to make one.
export function EmergencyForm({
  triageId,
  patientId,
}: {
  triageId?: number | null;
  patientId?: number | null;
}) {
  const [state, formAction, pending] = useActionState(requestAmbulance, initialState);
  const [, startTransition] = useTransition();
  const t = useTranslation();
  const locale = useLocale();
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [heard, setHeard] = useState<string[]>([]);
  const submittedRef = useRef(false);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setLocationError("Location isn't available on this device - the request will still go through without it.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setLocationError("Couldn't get your location - the request will still go through without it.")
    );
  }, []);

  useEffect(() => {
    if (state.error) submittedRef.current = false;
  }, [state]);

  useEffect(() => {
    if (state.requestId) speak(t("emergency.sentSpoken"), locale);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.requestId]);

  function send(channel: "Web" | "Voice", callerNotes = "") {
    if (submittedRef.current) return;
    submittedRef.current = true;
    const formData = new FormData();
    if (coords) {
      formData.set("latitude", String(coords.lat));
      formData.set("longitude", String(coords.lng));
    }
    if (triageId) formData.set("triageId", String(triageId));
    if (patientId) formData.set("patientId", String(patientId));
    formData.set("channel", channel);
    if (callerNotes) formData.set("callerNotes", callerNotes);
    startTransition(() => formAction(formData));
  }

  function handleVoice(text: string) {
    setHeard((prev) => [...prev.slice(-2), text]);
    if (detectEmergencyPhrase(text)) send("Voice", text);
  }

  const call108 = (
    <a
      href="tel:108"
      className="inline-flex items-center gap-2 text-sm font-medium text-danger underline underline-offset-2"
    >
      <Phone className="h-4 w-4" />
      {t("emergency.call108")}
    </a>
  );

  if (state.requestId) {
    return (
      <div className="max-w-md space-y-3 rounded-lg border border-danger/30 bg-danger/5 p-6">
        <p className="text-lg font-semibold text-danger">
          {t("emergency.sentTitle")} (#{state.requestId})
        </p>
        <p className="text-sm text-ink/70">{t("emergency.sentBody")}</p>
        {call108}
      </div>
    );
  }

  return (
    <div className="max-w-md space-y-6">
      <div className="space-y-3">
        <p className="text-sm text-ink/60">{t("emergency.subtitle")}</p>
        {locationError && <p className="text-xs text-marigold-600">{locationError}</p>}
        {coords && (
          <p className="text-xs text-success">
            Location captured ({coords.lat.toFixed(4)}, {coords.lng.toFixed(4)})
          </p>
        )}

        {state.error && (
          <p role="alert" className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
            {state.error}
          </p>
        )}

        <Button
          type="button"
          variant="danger"
          disabled={pending}
          onClick={() => send("Web")}
          className="h-14 w-full text-base"
        >
          <Siren className="h-5 w-5" />
          {pending ? t("common.loading") : t("emergency.callAmbulance")}
        </Button>
        {call108}
      </div>

      <section className="rounded-lg border border-danger/30 bg-white p-4">
        <h2 className="text-sm font-semibold text-ink">{t("emergency.voiceTitle")}</h2>
        <p className="mt-1 text-xs text-ink/60">{t("emergency.voiceHelp")}</p>
        <MicButton
          continuous
          onTranscript={handleVoice}
          label={t("emergency.voiceStart")}
          variant="danger"
          className="mt-3"
        />
        {heard.length > 0 && (
          <div className="mt-3 text-xs text-ink/60">
            <p className="font-medium">{t("emergency.heard")}:</p>
            <ul className="mt-0.5 space-y-0.5">
              {heard.map((line, i) => (
                <li key={`${i}-${line}`}>&ldquo;{line}&rdquo;</li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
