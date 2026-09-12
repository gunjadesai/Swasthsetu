// Supported language codes across the platform
export const AI_LANGUAGES = {
  en: { name: "English", nativeName: "English", script: "latin" },
  hi: { name: "Hindi", nativeName: "हिन्दी", script: "devanagari" },
  gu: { name: "Gujarati", nativeName: "ગુજરાતી", script: "gujarati" },
  mr: { name: "Marathi", nativeName: "मराठी", script: "devanagari" },
  ta: { name: "Tamil", nativeName: "தமிழ்", script: "tamil" },
  bn: { name: "Bengali", nativeName: "বাংলা", script: "bengali" },
  te: { name: "Telugu", nativeName: "తెలుగు", script: "telugu" },
  kn: { name: "Kannada", nativeName: "ಕನ್ನಡ", script: "kannada" },
} as const;

export type AILanguageCode = keyof typeof AI_LANGUAGES;

/**
 * Map of language code -> regex that matches typical character ranges
 * for that script. Used for auto-detection.
 */
const SCRIPT_PATTERNS: { lang: AILanguageCode; pattern: RegExp }[] = [
  // Devanagari: Hindi/Marathi — distinguish by common Marathi-only chars
  { lang: "mr", pattern: /[ऀ-ॿ]/ }, // Checked after hi
  { lang: "hi", pattern: /[ऀ-ॿ]/ },
  { lang: "gu", pattern: /[઀-૿]/ },
  { lang: "ta", pattern: /[஀-௿]/ },
  { lang: "bn", pattern: /[ঀ-৿]/ },
  { lang: "te", pattern: /[ఀ-౿]/ },
  { lang: "kn", pattern: /[ಀ-೿]/ },
];

// Marathi-specific words to distinguish from Hindi (both use Devanagari)
const MARATHI_MARKERS = /\b(आहे|नाही|करा|घ्या|होत|आणि|तुमच्या|रुग्णालय)\b/;

/**
 * Detect the language of a given text using Unicode script ranges and
 * common-word heuristics. Returns the best-guess language code.
 *
 * This is a lightweight, offline, zero-dependency detector.  For an
 * LLM-based detector (higher accuracy on mixed-script or transliterated
 * text), call the /api/ai/detect endpoint instead.
 */
export function detectLanguage(text: string): AILanguageCode {
  if (!text || text.trim().length === 0) return "en";

  // Check Gujarati, Tamil, Bengali, Telugu, Kannada first (unique scripts)
  for (const { lang, pattern } of SCRIPT_PATTERNS) {
    if (lang === "hi" || lang === "mr") continue; // handle Devanagari below
    if (pattern.test(text)) return lang;
  }

  // Devanagari: distinguish Hindi vs Marathi
  if (/[ऀ-ॿ]/.test(text)) {
    return MARATHI_MARKERS.test(text) ? "mr" : "hi";
  }

  // Default to English (Latin script or unknown)
  return "en";
}
