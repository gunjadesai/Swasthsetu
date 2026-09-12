import type { Locale } from "@/lib/i18n/dictionaries";
import type { RecommendedAction, UrgencyLevel } from "@/lib/types";

// Rule-based triage layer. Since migration 003 the primary assessment
// comes from the AI model (lib/ai-triage.ts), but these rules still run
// on every triage and act as a safety floor: a matched red flag can
// raise the AI's urgency, never lower it. They are also the complete
// fallback when the AI is unreachable - offline, no API key, or the
// time-boxed SMS/IVR/USSD channels - and they stay auditable: a doctor
// can see exactly which symptom routed a patient where.
//
// Isomorphic on purpose (no server imports): the triage wizard and the
// voice SOS listener use it in the browser too.
export type SymptomOption = {
  key: string;
  label_en: string;
  label_hi: string;
  label_gu: string;
  label_mr: string;
  weight: UrgencyLevel;
  // Lower-case phrases matched in free text, voice transcripts and SMS -
  // English, Hindi, Gujarati, Marathi and common Hinglish transliterations.
  keywords: string[];
};

export const SYMPTOM_OPTIONS: SymptomOption[] = [
  {
    key: "fever_mild",
    label_en: "Mild fever (< 2 days)",
    label_hi: "हल्का बुखार (2 दिन से कम)",
    label_gu: "હળવો તાવ (2 દિવસથી ઓછો)",
    label_mr: "सौम्य ताप (2 दिवसांपेक्षा कमी)",
    weight: "Low",
    keywords: ["mild fever", "halka bukhar", "हल्का बुखार", "હળવો તાવ", "सौम्य ताप"],
  },
  {
    key: "cough_cold",
    label_en: "Cough / cold",
    label_hi: "खांसी / जुकाम",
    label_gu: "ઉધરસ / શરદી",
    label_mr: "खोकला / सर्दी",
    weight: "Low",
    keywords: ["cough", "cold", "khansi", "khasi", "jukam", "sardi", "खांसी", "खाँसी", "जुकाम", "सर्दी", "ઉધરસ", "શરદી", "खोकला"],
  },
  {
    key: "body_ache",
    label_en: "Body ache / fatigue",
    label_hi: "शरीर में दर्द / थकान",
    label_gu: "શરીરમાં દુખાવો / થાક",
    label_mr: "अंगदुखी / थकवा",
    weight: "Low",
    keywords: ["body ache", "body pain", "fatigue", "weakness", "badan dard", "kamzori", "बदन दर्द", "शरीर में दर्द", "कमजोरी", "थकान", "શરીરમાં દુખાવો", "થાક", "નબળાઈ", "अंगदुखी", "थकवा", "अशक्तपणा"],
  },
  {
    key: "fever_high",
    label_en: "High fever (> 2 days)",
    label_hi: "तेज़ बुखार (2 दिन से अधिक)",
    label_gu: "ઊંચો તાવ (2 દિવસથી વધુ)",
    label_mr: "जास्त ताप (2 दिवसांपेक्षा जास्त)",
    weight: "Medium",
    // A bare "fever" maps here rather than to fever_mild - with no
    // duration given, the more cautious reading wins.
    keywords: ["fever", "high fever", "bukhar", "bukhaar", "tez bukhar", "बुखार", "ताप", "તાવ"],
  },
  {
    key: "vomiting_diarrhea",
    label_en: "Vomiting / diarrhoea",
    label_hi: "उल्टी / दस्त",
    label_gu: "ઉલટી / ઝાડા",
    label_mr: "उलट्या / जुलाब",
    weight: "Medium",
    keywords: ["vomit", "vomiting", "diarrhea", "diarrhoea", "loose motion", "ulti", "dast", "उल्टी", "दस्त", "ઉલટી", "ઝાડા", "उलट्या", "उलटी", "जुलाब"],
  },
  {
    key: "skin_rash",
    label_en: "Rash / skin infection",
    label_hi: "चकत्ते / त्वचा संक्रमण",
    label_gu: "ફોલ્લીઓ / ચામડીનો ચેપ",
    label_mr: "पुरळ / त्वचेचा संसर्ग",
    weight: "Medium",
    keywords: ["rash", "itching", "skin infection", "khujli", "चकत्ते", "खुजली", "ફોલ્લીઓ", "ખંજવાળ", "पुरळ", "खाज"],
  },
  {
    key: "pregnancy_checkup",
    label_en: "Routine pregnancy check-up",
    label_hi: "नियमित गर्भावस्था जांच",
    label_gu: "નિયમિત ગર્ભાવસ્થા તપાસ",
    label_mr: "नियमित गर्भावस्था तपासणी",
    weight: "Medium",
    keywords: ["pregnancy checkup", "pregnancy check-up", "pregnant", "garbhvati", "गर्भवती", "ગર્ભવતી", "गरोदर"],
  },
  {
    key: "breathing_difficulty",
    label_en: "Difficulty breathing",
    label_hi: "सांस लेने में कठिनाई",
    label_gu: "શ્વાસ લેવામાં તકલીફ",
    label_mr: "श्वास घेण्यास त्रास",
    weight: "High",
    keywords: ["breathless", "difficulty breathing", "shortness of breath", "cannot breathe", "can't breathe", "saans", "sans lene", "सांस", "साँस", "શ્વાસ", "श्वास", "धाप"],
  },
  {
    key: "severe_abdominal_pain",
    label_en: "Severe abdominal pain",
    label_hi: "पेट में गंभीर दर्द",
    label_gu: "પેટમાં સખત દુખાવો",
    label_mr: "पोटात तीव्र वेदना",
    weight: "High",
    keywords: ["severe stomach pain", "severe abdominal pain", "pet me tez dard", "पेट में तेज़ दर्द", "पेट में तेज दर्द", "पेट में गंभीर दर्द", "પેટમાં સખત દુખાવો", "पोटात तीव्र वेदना", "पोटात खूप दुखत"],
  },
  {
    key: "high_bp_pregnancy",
    label_en: "High blood pressure during pregnancy",
    label_hi: "गर्भावस्था में उच्च रक्तचाप",
    label_gu: "ગર્ભાવસ્થામાં ઊંચું બ્લડ પ્રેશર",
    label_mr: "गर्भावस्थेत उच्च रक्तदाब",
    weight: "High",
    keywords: ["high bp", "high blood pressure", "हाई बीपी", "उच्च रक्तचाप", "બીપી વધારે", "उच्च रक्तदाब"],
  },
  {
    key: "chest_pain",
    label_en: "Chest pain",
    label_hi: "छाती में दर्द",
    label_gu: "છાતીમાં દુખાવો",
    label_mr: "छातीत दुखणे",
    weight: "Emergency",
    keywords: ["chest pain", "heart attack", "seene me dard", "chhati me dard", "सीने में दर्द", "छाती में दर्द", "છાતીમાં દુખાવો", "छातीत दुख", "छातीत वेदना"],
  },
  {
    key: "heavy_bleeding",
    label_en: "Heavy bleeding",
    label_hi: "अधिक रक्तस्राव",
    label_gu: "વધુ પડતો રક્તસ્ત્રાવ",
    label_mr: "जास्त रक्तस्त्राव",
    weight: "Emergency",
    keywords: ["heavy bleeding", "bleeding a lot", "bahut khoon", "khoon beh", "बहुत खून", "खून बह", "रक्तस्राव", "રક્તસ્ત્રાવ", "रक्तस्त्राव"],
  },
  {
    key: "unconscious_unresponsive",
    label_en: "Unconscious / unresponsive",
    label_hi: "बेहोश / अचेत",
    label_gu: "બેભાન / પ્રતિભાવ નથી",
    label_mr: "बेशुद्ध / प्रतिसाद नाही",
    weight: "Emergency",
    keywords: ["unconscious", "not responding", "unresponsive", "fainted", "behosh", "बेहोश", "अचेत", "બેભાન", "बेशुद्ध"],
  },
  {
    key: "severe_injury",
    label_en: "Severe injury / accident",
    label_hi: "गंभीर चोट / दुर्घटना",
    label_gu: "ગંભીર ઈજા / અકસ્માત",
    label_mr: "गंभीर दुखापत / अपघात",
    weight: "Emergency",
    keywords: ["accident", "severe injury", "head injury", "fracture", "durghatna", "दुर्घटना", "हादसा", "गंभीर चोट", "અકસ્માત", "ગંભીર ઈજા", "अपघात", "गंभीर दुखापत"],
  },
  {
    key: "seizure",
    label_en: "Seizure / fits",
    label_hi: "दौरा / ऐंठन",
    label_gu: "આંચકી / ખેંચ",
    label_mr: "झटके / फिट येणे",
    weight: "Emergency",
    keywords: ["seizure", "convulsion", "fits", "mirgi", "daura", "दौरा", "मिर्गी", "ऐंठन", "આંચકી", "ખેંચ", "झटके", "झटका"],
  },
  {
    key: "snake_bite_poisoning",
    label_en: "Snake bite / poisoning",
    label_hi: "सांप का काटना / ज़हर",
    label_gu: "સાપ કરડવો / ઝેર",
    label_mr: "सर्पदंश / विषबाधा",
    weight: "Emergency",
    keywords: ["snake bite", "snakebite", "poison", "pesticide", "saap", "sanp", "zeher", "zehar", "सांप", "साँप", "ज़हर", "जहर", "સાપ", "ઝેર", "કીટનાશક", "सर्पदंश", "साप चावला", "विषबाधा"],
  },
  {
    key: "stroke_signs",
    label_en: "Sudden weakness on one side / slurred speech",
    label_hi: "अचानक एक तरफ कमजोरी / बोलने में दिक्कत",
    label_gu: "અચાનક એક બાજુ નબળાઈ / બોલવામાં તકલીફ",
    label_mr: "अचानक एका बाजूला अशक्तपणा / बोलण्यात अडचण",
    weight: "Emergency",
    keywords: ["stroke", "paralysis", "face drooping", "slurred speech", "lakwa", "लकवा", "લકવો", "अर्धांगवायू"],
  },
  {
    key: "pregnancy_danger",
    label_en: "Pregnancy: bleeding, fits or severe headache",
    label_hi: "गर्भावस्था: खून आना, दौरा या तेज़ सिरदर्द",
    label_gu: "ગર્ભાવસ્થા: રક્તસ્ત્રાવ, આંચકી અથવા સખત માથાનો દુખાવો",
    label_mr: "गर्भावस्था: रक्तस्त्राव, झटके किंवा तीव्र डोकेदुखी",
    weight: "Emergency",
    keywords: ["bleeding in pregnancy", "labour pain", "labor pain", "water broke", "baby not moving", "prasav", "प्रसव", "गर्भावस्था में खून", "પ્રસૂતિ", "प्रसूती"],
  },
];

// Words someone shouts when they need help right now - on top of every
// Emergency-weighted symptom keyword. Used by the voice SOS listener.
const EMERGENCY_PHRASES = [
  "help",
  "emergency",
  "ambulance",
  "save me",
  "bachao",
  "madad",
  "एम्बुलेंस",
  "एंबुलेंस",
  "मदद",
  "बचाओ",
  "आपातकाल",
  "इमरजेंसी",
  "એમ્બ્યુલન્સ",
  "ઈમરજન્સી",
  "મદદ",
  "બચાવો",
  "કટોકટી",
  "रुग्णवाहिका",
  "मदत",
  "वाचवा",
  "आणीबाणी",
];

export const URGENCY_RANK: Record<UrgencyLevel, number> = {
  Low: 0,
  Medium: 1,
  High: 2,
  Emergency: 3,
};

export function maxUrgency(a: UrgencyLevel, b: UrgencyLevel): UrgencyLevel {
  return URGENCY_RANK[b] > URGENCY_RANK[a] ? b : a;
}

export function recommendedActionFor(urgency: UrgencyLevel): RecommendedAction {
  return urgency === "Emergency"
    ? "CallAmbulance"
    : urgency === "High"
      ? "VisitPHC"
      : urgency === "Medium"
        ? "BookAppointment"
        : "SelfCare";
}

export function symptomLabel(option: SymptomOption, locale: Locale): string {
  switch (locale) {
    case "hi":
      return option.label_hi;
    case "gu":
      return option.label_gu;
    case "mr":
      return option.label_mr;
    default:
      return option.label_en;
  }
}

export function computeTriageResult(selectedKeys: string[]): {
  urgency_level: UrgencyLevel;
  recommended_action: RecommendedAction;
} {
  const urgency_level = SYMPTOM_OPTIONS.filter((s) => selectedKeys.includes(s.key)).reduce<UrgencyLevel>(
    (worst, s) => maxUrgency(worst, s.weight),
    "Low"
  );
  return { urgency_level, recommended_action: recommendedActionFor(urgency_level) };
}

// Latin-script keywords need word boundaries ("cold" must not match
// "scold"); Devanagari/Gujarati words are matched as substrings because
// \b doesn't understand those scripts and inflected forms are common.
function containsPhrase(text: string, phrase: string): boolean {
  if (/^[\x00-\x7F]+$/.test(phrase)) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`).test(text);
  }
  return text.includes(phrase);
}

export function matchSymptomKeywords(text: string | null | undefined): string[] {
  const normalized = (text ?? "").toLowerCase();
  if (!normalized.trim()) return [];
  return SYMPTOM_OPTIONS.filter((s) => s.keywords.some((k) => containsPhrase(normalized, k))).map((s) => s.key);
}

export function detectEmergencyPhrase(text: string | null | undefined): boolean {
  const normalized = (text ?? "").toLowerCase();
  if (!normalized.trim()) return false;
  if (EMERGENCY_PHRASES.some((p) => containsPhrase(normalized, p))) return true;
  return matchSymptomKeywords(normalized).some(
    (key) => SYMPTOM_OPTIONS.find((s) => s.key === key)?.weight === "Emergency"
  );
}

export function ruleBasedTriage(input: { symptomKeys: string[]; freeText?: string | null }): {
  urgency_level: UrgencyLevel;
  recommended_action: RecommendedAction;
  symptomKeys: string[];
  redFlags: string[];
} {
  const symptomKeys = Array.from(new Set([...input.symptomKeys, ...matchSymptomKeywords(input.freeText)]));
  const { urgency_level, recommended_action } = computeTriageResult(symptomKeys);
  const redFlags = SYMPTOM_OPTIONS.filter(
    (s) => symptomKeys.includes(s.key) && URGENCY_RANK[s.weight] >= URGENCY_RANK.High
  ).map((s) => s.label_en);
  return { urgency_level, recommended_action, symptomKeys, redFlags };
}
