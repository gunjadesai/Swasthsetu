export type TranslationMode = "general" | "medical" | "simplify";

export interface TranslateOptions {
  text: string;
  from?: string; // Optional: auto-detect if not provided
  to: string;
  mode?: TranslationMode;
  context?: string; // Additional context (e.g. "Doctor prescription")
}

// Fallback translations if API fails, so demo never breaks
const FALLBACK_TRANSLATIONS: Record<string, Record<string, string>> = {
  hi: {
    "Take 1 tablet after meals": "खाना खाने के बाद 1 गोली लें",
    "Please visit your nearest PHC/hospital soon.": "कृपया शीघ्र ही अपने नज़दीकी पीएचसी/अस्पताल जाएं।",
  },
  mr: {
    "Take 1 tablet after meals": "जेवणानंतर 1 गोळी घ्या",
    "Please visit your nearest PHC/hospital soon.": "कृपया लवकरात लवकर तुमच्या जवळच्या PHC/रुग्णालयाला भेट द्या.",
    "Dashboard": "डॅशबोर्ड",
  },
  gu: {
    "Take 1 tablet after meals": "જમ્યા પછી 1 ગોળી લો",
    "Please visit your nearest PHC/hospital soon.": "કૃપા કરીને ટૂંક સમયમાં તમારા નજીકના પીએચસી/હોસ્પિટલની મુલાકાત લો.",
  },
};

/**
 * Robust AI Translation Engine.
 * In a real production SIH app, this would call Bhashini, OpenAI, or LLMs.
 * We include a fallback mechanism to prevent demo failures.
 */
export async function translateText({
  text,
  from,
  to,
  mode = "general",
  context,
}: TranslateOptions): Promise<string> {
  // 1. Check if we're translating to the same language
  if (from === to || !to) return text;

  // 2. Try fallback cache (simulate lightning-fast common medical translations)
  if (FALLBACK_TRANSLATIONS[to]?.[text]) {
    return FALLBACK_TRANSLATIONS[to][text];
  }

  // 3. In browser/client, route to our Next.js API endpoint to protect API keys
  if (typeof window !== "undefined") {
    try {
      const response = await fetch("/api/ai/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, from, to, mode, context }),
      });
      if (response.ok) {
        const data = await response.json();
        return data.translatedText || text;
      }
    } catch (e) {
      console.error("AI Translation Error (Client):", e);
    }
    return text; // Return original on failure
  }

  // 4. Server-Side Execution (Replace with real LLM provider later)
  // For now, if we don't have API keys, we return a mock format to show it works,
  // or actually call an API if the key exists.

  const apiKey = process.env.AI_TRANSLATION_API_KEY || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    // Graceful fallback for SIH when API keys aren't set
    console.warn("No AI API KEY set. Returning simulated translation for:", text);
    return `[${to.toUpperCase()}] ${text}`;
  }

  try {
    // Example using OpenAI-compatible endpoint
    const systemPrompt =
      mode === "medical"
        ? `You are an expert medical translator specializing in Indian languages. Translate from ${from || 'auto'} to ${to}. Preserve medical terminology (drug names, dosages) precisely.`
        : mode === "simplify"
        ? `You are a helpful rural health worker. Translate the user's medical jargon from ${from || 'auto'} to simple, easy-to-understand terms in ${to}.`
        : `Translate the following text from ${from || 'auto'} to ${to} accurately.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo", // or 4o-mini
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Context: ${context || 'None'}\n\nText: ${text}` }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) throw new Error("Translation API failed");

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || text;
  } catch (err) {
    console.error("AI Translation Error (Server):", err);
    return text;
  }
}
