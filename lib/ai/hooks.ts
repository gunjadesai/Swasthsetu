"use client";

import { useState, useCallback, useRef } from "react";
import { useLocale } from "@/lib/i18n/locale-context";

interface UseAiTranslateOptions {
  mode?: "general" | "medical" | "simplify";
  context?: string;
}

/**
 * React hook for on-demand AI translation of arbitrary text in client components.
 *
 * Usage:
 *   const { translate, translated, pending } = useAiTranslate({ mode: "medical" });
 *   await translate(doctorNote);
 */
export function useAiTranslate({ mode = "general", context }: UseAiTranslateOptions = {}) {
  const locale = useLocale();
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Simple request cache keyed by `${text}::${locale}`
  const cache = useRef<Record<string, string>>({});

  const translate = useCallback(
    async (text: string, to?: string): Promise<string> => {
      const target = to ?? locale;
      if (!text || target === "en") return text;

      const cacheKey = `${text}::${target}::${mode}`;
      if (cache.current[cacheKey]) return cache.current[cacheKey];

      setPending(true);
      setError(null);

      try {
        const res = await fetch("/api/ai/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, to: target, mode, context }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const result: string = json.translatedText ?? text;

        cache.current[cacheKey] = result;
        setTranslations((prev) => ({ ...prev, [cacheKey]: result }));
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Translation failed";
        setError(msg);
        return text; // graceful fallback - never break the UI
      } finally {
        setPending(false);
      }
    },
    [locale, mode, context]
  );

  const translated = (text: string, to?: string) =>
    translations[`${text}::${(to ?? locale)}::${mode}`] ?? null;

  return { translate, translated, pending, error };
}

/**
 * Simple hook for language auto-detection.
 */
export function useAiDetect() {
  const [detected, setDetected] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const detect = useCallback(async (text: string) => {
    if (!text.trim()) return;
    setPending(true);
    try {
      const res = await fetch("/api/ai/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const json = await res.json();
      setDetected(json.detectedLanguage ?? null);
    } catch {
      // silently ignore – detection is best-effort
    } finally {
      setPending(false);
    }
  }, []);

  return { detect, detected, pending };
}
