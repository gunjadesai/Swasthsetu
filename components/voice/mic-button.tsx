"use client";

import { Mic, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale, useTranslation } from "@/lib/i18n/locale-context";
import { useSpeechRecognition, type SpeechErrorCode } from "@/lib/voice/use-speech";
import { cn } from "@/lib/utils";

function errorKey(code: SpeechErrorCode) {
  if (code === "insecure") return "voice.insecure" as const;
  if (code === "not-allowed" || code === "service-not-allowed") return "voice.denied" as const;
  if (code === "audio-capture") return "voice.noMic" as const;
  if (code === "network") return "voice.network" as const;
  return "voice.error" as const;
}

export function MicButton({
  onTranscript,
  continuous = false,
  label,
  className,
  buttonClassName,
  variant = "secondary",
}: {
  onTranscript: (text: string) => void;
  continuous?: boolean;
  label?: string;
  className?: string;
  buttonClassName?: string;
  variant?: "secondary" | "danger" | "primary";
}) {
  const locale = useLocale();
  const t = useTranslation();
  const { supported, listening, interim, error, start, stop } = useSpeechRecognition({
    locale,
    continuous,
    onFinalTranscript: onTranscript,
  });

  if (supported === null) return null;
  if (!supported) {
    return <p className={cn("text-xs text-ink/70", className)}>{t("voice.unsupported")}</p>;
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <Button
        type="button"
        variant={listening ? "danger" : variant}
        onClick={listening ? stop : start}
        aria-pressed={listening}
        className={buttonClassName}
      >
        {listening ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        {listening ? t("voice.stop") : (label ?? t("voice.speak"))}
      </Button>
      {listening && (
        <p className="text-xs text-ink/70" aria-live="polite">
          {interim || t("voice.listening")}
        </p>
      )}
      {error && (
        <p role="alert" className="text-xs text-danger">
          {t(errorKey(error))}
        </p>
      )}
    </div>
  );
}
