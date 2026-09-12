"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n/dictionaries";

// Browser voice input/output for low-literacy and hands-busy users.
// Uses the Web Speech API that ships in Chrome/Edge/Android WebView -
// no extra dependency, and it recognises en-IN, hi-IN and gu-IN. Where
// it isn't available (Firefox, some iOS versions) `supported` is false
// and callers fall back to the normal buttons/checkboxes; keypad phones
// get the same voice flow through the IVR line instead (app/api/ivr).
export const BROWSER_SPEECH_LANG: Record<Locale, string> = { en: "en-IN", hi: "hi-IN", gu: "gu-IN", mr: "mr-IN" };

type RecognitionAlternative = { transcript: string };
type RecognitionResult = ArrayLike<RecognitionAlternative> & { isFinal: boolean };
type RecognitionResultEvent = { resultIndex: number; results: ArrayLike<RecognitionResult> };
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: RecognitionResultEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type RecognitionConstructor = new () => Recognition;

function recognitionConstructor(): RecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export type SpeechErrorCode = "unsupported" | "not-allowed" | "network" | "start-failed" | string;

export function useSpeechRecognition({
  locale,
  continuous = false,
  onFinalTranscript,
}: {
  locale: Locale;
  // Keep listening across pauses (voice SOS) instead of stopping after
  // one utterance (dictation).
  continuous?: boolean;
  onFinalTranscript: (text: string) => void;
}) {
  // null until mounted, so server and first client render agree.
  const [supported, setSupported] = useState<boolean | null>(null);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<SpeechErrorCode | null>(null);
  const recognitionRef = useRef<Recognition | null>(null);
  const keepListeningRef = useRef(false);
  const onFinalRef = useRef(onFinalTranscript);

  useEffect(() => {
    onFinalRef.current = onFinalTranscript;
  }, [onFinalTranscript]);

  useEffect(() => {
    setSupported(recognitionConstructor() !== null);
    return () => {
      keepListeningRef.current = false;
      recognitionRef.current?.abort();
    };
  }, []);

  const start = useCallback(() => {
    const Ctor = recognitionConstructor();
    if (!Ctor) {
      setError("unsupported");
      return;
    }
    // Browsers only allow the microphone on https:// or localhost - opening
    // the dev server from a phone via http://192.168.x.x fails as "not-allowed".
    if (!window.isSecureContext) {
      setError("insecure");
      return;
    }
    recognitionRef.current?.abort();

    const recognition = new Ctor();
    recognition.lang = BROWSER_SPEECH_LANG[locale];
    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0]?.transcript ?? "";
        if (result.isFinal) {
          if (text.trim()) onFinalRef.current(text.trim());
        } else {
          interimText += text;
        }
      }
      setInterim(interimText);
    };
    recognition.onerror = (event) => {
      if (event.error === "no-speech" || event.error === "aborted") return;
      setError(event.error);
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        keepListeningRef.current = false;
      }
    };
    recognition.onend = () => {
      // Chrome ends "continuous" sessions after a silence - restart while
      // the user still wants the mic open.
      if (keepListeningRef.current && continuous) {
        try {
          recognition.start();
          return;
        } catch {
          // fall through to stopped state
        }
      }
      setListening(false);
      setInterim("");
    };

    keepListeningRef.current = true;
    setError(null);
    try {
      recognition.start();
      recognitionRef.current = recognition;
      setListening(true);
    } catch {
      setError("start-failed");
    }
  }, [locale, continuous]);

  const stop = useCallback(() => {
    keepListeningRef.current = false;
    recognitionRef.current?.stop();
    setListening(false);
    setInterim("");
  }, []);

  return { supported, listening, interim, error, start, stop };
}

// Reads text aloud in the user's language (triage result, ambulance
// confirmation). Returns false when the device has no speech synthesis.
export function speak(text: string, locale: Locale): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  const lang = BROWSER_SPEECH_LANG[locale];
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 0.95;
  const voices = window.speechSynthesis.getVoices();
  const voice =
    voices.find((v) => v.lang === lang) ?? voices.find((v) => v.lang.startsWith(lang.slice(0, 2)));
  if (voice) utterance.voice = voice;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
  return true;
}
