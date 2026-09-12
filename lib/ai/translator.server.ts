import { GoogleGenAI } from "@google/genai";
import {
  KNOWN_TRANSLATIONS,
  LANGUAGE_NAMES,
  MAX_TRANSLATE_CHARS,
  type TranslateOptions,
  type TranslationMode,
  type TranslationResult,
} from "./translator";

// Server half of the translator: the only place the Gemini SDK and the
// API key are touched. Kept out of lib/ai/translator.ts because that
// module is imported by Client Components, and a client bundle must
// carry neither the SDK nor any hint of the key.
//
// Same lite model as the symptom triage (lib/ai-triage.ts): free-tier
// eligible and fast enough for a phone on a village connection.
const MODEL = "gemini-flash-lite-latest";

function systemPrompt(mode: TranslationMode, from: string | undefined, to: string): string {
  const source = from ? (LANGUAGE_NAMES[from] ?? from) : "the source language";
  const target = LANGUAGE_NAMES[to] ?? to;
  const base = `Translate from ${source} into ${target}. Reply with the translation only - no quotes, no explanation, no transliteration in brackets.`;
  if (mode === "medical") {
    return `You are a medical translator for rural Indian public health. ${base} Keep drug names, dosages and numbers exactly as written.`;
  }
  if (mode === "simplify") {
    return `You are a rural health worker explaining a doctor's words to someone with little schooling. ${base} Use short, everyday words.`;
  }
  return base;
}

export async function translateOnServer({
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

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // No key: the original text, honestly labelled. Never a fake
    // "[HI] ..." string that reads like a translation to a patient.
    return { text, translated: false, reason: "unavailable" };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: context ? `Context: ${context}\n\n${text}` : text,
      config: {
        systemInstruction: systemPrompt(mode, from, to),
        temperature: 0.2,
      },
    });
    const translated = response.text?.trim();
    return translated
      ? { text: translated, translated: true }
      : { text, translated: false, reason: "failed" };
  } catch (err) {
    console.error("[translate] Gemini call failed:", err);
    return { text, translated: false, reason: "failed" };
  }
}
