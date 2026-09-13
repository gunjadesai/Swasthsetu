export type TranslationMode = "general" | "medical" | "simplify";

export interface TranslateOptions {
  text: string;
  from?: string; // Optional: auto-detect if not provided
  to: string;
  mode?: TranslationMode;
  context?: string; // Additional context (e.g. "Doctor prescription")
}

// What every caller gets back. `translated: false` means the text came
// back unchanged - no key configured, the model failed, or source and
// target are the same language. It is never a fake translation: the old
// version returned "[HI] Take 1 tablet after meals" when no API key was
// set, which reads like a translation to anyone demoing the app and
// would read like one to a patient.
export type TranslationResult = {
  text: string;
  translated: boolean;
  reason?: "unavailable" | "failed" | "same-language";
};

// The model call itself lives in translator.server.ts: this module is
// imported by Client Components, and pulling @google/genai in here would
// ship the whole SDK to a phone that can never use it. The same Gemini
// key the symptom triage uses - this app has one AI provider, not two
// (the previous OpenAI path needed an OPENAI_API_KEY that isn't in
// .env.local.example and was never set).

// Longest text we will send to the model. Clinical notes and
// prescriptions are short; anything longer is either a mistake or an
// attempt to run up the API bill.
export const MAX_TRANSLATE_CHARS = 2000;

// Exported for translator.server.ts, which builds the model prompt.
export const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  hi: "Hindi",
  gu: "Gujarati",
  mr: "Marathi",
};

// Hand-checked strings that appear constantly in the demo flows. Not a
// cache in front of the model - just correct text we already have, so
// common phrases are instant and right even with no network.
export const KNOWN_TRANSLATIONS: Record<string, Record<string, string>> = {
  hi: {
    "Take 1 tablet after meals": "खाना खाने के बाद 1 गोली लें",
    "Please visit your nearest PHC/hospital soon.": "कृपया शीघ्र ही अपने नज़दीकी पीएचसी/अस्पताल जाएं।",
  },
  mr: {
    "Take 1 tablet after meals": "जेवणानंतर 1 गोळी घ्या",
    "Please visit your nearest PHC/hospital soon.":
      "कृपया लवकरात लवकर तुमच्या जवळच्या PHC/रुग्णालयाला भेट द्या.",
  },
  gu: {
    "Take 1 tablet after meals": "જમ્યા પછી 1 ગોળી લો",
    "Please visit your nearest PHC/hospital soon.":
      "કૃપા કરીને ટૂંક સમયમાં તમારા નજીકના પીએચસી/હોસ્પિટલની મુલાકાત લો.",
  },
};

/**
 * Translate a short piece of text.
 *
 * Goes through /api/ai/translate, which requires a signed-in session and
 * enforces the length limit - the API key never leaves the server.
 * Server-side callers use translateOnServer() in translator.server.ts.
 */
export async function translateText({
  text,
  from,
  to,
  mode = "general",
  context,
}: TranslateOptions): Promise<TranslationResult> {
  if (!text || !to || from === to) {
    return { text, translated: false, reason: "same-language" };
  }
  if (text.length > MAX_TRANSLATE_CHARS) {
    return { text, translated: false, reason: "failed" };
  }

  const known = KNOWN_TRANSLATIONS[to]?.[text];
  if (known) return { text: known, translated: true };

  if (typeof window !== "undefined") {
    try {
      const response = await fetch("/api/ai/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, from, to, mode, context }),
      });
      if (response.ok) {
        const data = (await response.json()) as { translatedText?: string; translated?: boolean };
        return {
          text: data.translatedText || text,
          translated: Boolean(data.translated),
          reason: data.translated ? undefined : "unavailable",
        };
      }
    } catch {
      // Offline or the route is down - fall through to the original text.
    }
    return { text, translated: false, reason: "unavailable" };
  }

  // Not in a browser: the caller wants the server path, which lives in
  // translator.server.ts (it can't be imported from here without
  // dragging the model SDK into the client bundle).
  return { text, translated: false, reason: "unavailable" };
}
