import type { Locale } from "@/lib/i18n/dictionaries";
import type { AmbulanceRequestStatus, RecommendedAction, UrgencyLevel } from "@/lib/types";

// Short, plain-language texts for the keypad-phone channels (SMS, USSD,
// IVR). Kept separate from lib/i18n/dictionaries.ts because these are
// length-constrained (a USSD screen is ~182 chars; Hindi/Gujarati SMS is
// 70 chars per segment) and several are functions of runtime values.
// Every text points to 108 - the national ambulance number - because a
// platform request must never be the only route to help.

type TelecomTexts = {
  smsMenu: string;
  notRegistered: string;
  ambulanceSent: (id: number) => string;
  ambulanceFailed: string;
  emergencyPrompt: string;
  urgency: Record<UrgencyLevel, string>;
  action: Record<RecommendedAction, string>;
  noAppointments: string;
  appointmentsHeader: string;
  noAmbulance: string;
  ambulanceStatus: (id: number, status: AmbulanceRequestStatus) => string;
  statusLabel: Record<AmbulanceRequestStatus, string>;
  contactAlert: (name: string, id: number) => string;
  bookingConfirmed: (doctor: string, when: string, mode: string) => string;
  ussdMain: string;
  ussdConfirmSos: string;
  ussdCancelled: string;
  ussdChooseSymptom: string;
  ussdEmergencyConfirm: string;
  ussdInvalid: string;
  // [symptom key from lib/triage.ts, short label] - numbered 1..9 on screen
  ussdSymptoms: [string, string][];
  ivrWelcome: string;
  ivrDescribe: string;
  ivrNotUnderstood: string;
  ivrGoodbye: string;
  ivrNotRegistered: string;
  ivrAmbulanceOffer: string;
};

const en: TelecomTexts = {
  smsMenu:
    "Swasthsetu: SOS = ambulance. CHECK <your symptoms> = symptom check. APPT = your appointments. STATUS = ambulance status. In danger, call 108.",
  notRegistered:
    "Swasthsetu: this number is not registered. Ask your ASHA worker to register you. For an emergency call 108 now.",
  ambulanceSent: (id) =>
    `Swasthsetu: ambulance request #${id} sent. Stay where you are and keep this phone on. If life-threatening, also call 108.`,
  ambulanceFailed: "Swasthsetu: could not send the ambulance request. Call 108 now.",
  emergencyPrompt: "This may be an emergency. Reply SOS to send an ambulance, or call 108 now.",
  urgency: { Low: "Low urgency", Medium: "Medium urgency", High: "High urgency", Emergency: "EMERGENCY" },
  action: {
    SelfCare: "Rest and self-care at home should be enough.",
    BookAppointment: "Please see a doctor in the next few days.",
    VisitPHC: "Please go to your nearest PHC/hospital today.",
    Teleconsult: "A doctor voice/video consult is advised - book in the app or ask your ASHA.",
    CallAmbulance: "Reply SOS now for an ambulance, or call 108.",
  },
  noAppointments: "Swasthsetu: you have no upcoming appointments.",
  appointmentsHeader: "Swasthsetu appointments:",
  noAmbulance: "Swasthsetu: no ambulance requests found.",
  ambulanceStatus: (id, status) => `Swasthsetu: ambulance request #${id} - ${en.statusLabel[status]}.`,
  statusLabel: {
    Requested: "waiting for an ambulance",
    Dispatched: "ambulance on the way",
    Completed: "completed",
    Cancelled: "cancelled",
  },
  contactAlert: (name, id) =>
    `Swasthsetu alert: ${name} has requested an emergency ambulance (request #${id}). Please contact them or call 108.`,
  bookingConfirmed: (doctor, when, mode) => `Swasthsetu: ${mode} with Dr. ${doctor} booked for ${when}.`,
  ussdMain: "Swasthsetu\n1. Emergency ambulance\n2. Symptom check\n3. My appointments\n4. Ambulance status",
  ussdConfirmSos: "Send an ambulance to your registered village now?\n1. Yes\n2. No",
  ussdCancelled: "Cancelled. In an emergency call 108.",
  ussdChooseSymptom: "Main problem:",
  ussdEmergencyConfirm: "This may be an emergency.\n1. Send ambulance now\n2. No",
  ussdInvalid: "Invalid choice. Please try again.",
  ussdSymptoms: [
    ["fever_high", "Fever"],
    ["cough_cold", "Cough/cold"],
    ["vomiting_diarrhea", "Vomit/diarrhoea"],
    ["breathing_difficulty", "Breathing trouble"],
    ["chest_pain", "Chest pain"],
    ["heavy_bleeding", "Heavy bleeding"],
    ["unconscious_unresponsive", "Unconscious/fits"],
    ["severe_injury", "Injury/accident"],
    ["pregnancy_danger", "Pregnancy problem"],
  ],
  ivrWelcome:
    "Welcome to Swasthsetu. For an emergency ambulance, press 1 or say emergency. To check your symptoms, press 2, or simply describe your problem now.",
  ivrDescribe: "Please describe your health problem now.",
  ivrNotUnderstood: "Sorry, I did not understand.",
  ivrGoodbye: "Take care. Goodbye.",
  ivrNotRegistered:
    "This number is not registered with Swasthsetu. For an emergency, please call 108, or ask your ASHA worker to register you.",
  ivrAmbulanceOffer: "To send an ambulance now, press 1.",
};

const hi: TelecomTexts = {
  smsMenu:
    "स्वास्थ्य सेतु: SOS = एम्बुलेंस। CHECK <लक्षण> = लक्षण जांच। APPT = आपके अपॉइंटमेंट। STATUS = एम्बुलेंस की स्थिति। खतरे में 108 पर कॉल करें।",
  notRegistered:
    "स्वास्थ्य सेतु: यह नंबर पंजीकृत नहीं है। अपनी आशा कार्यकर्ता से पंजीकरण करवाएं। आपातकाल में अभी 108 पर कॉल करें।",
  ambulanceSent: (id) =>
    `स्वास्थ्य सेतु: एम्बुलेंस अनुरोध #${id} भेजा गया। जहां हैं वहीं रहें और फ़ोन चालू रखें। जान का खतरा हो तो 108 पर भी कॉल करें।`,
  ambulanceFailed: "स्वास्थ्य सेतु: एम्बुलेंस अनुरोध नहीं भेजा जा सका। अभी 108 पर कॉल करें।",
  emergencyPrompt: "यह आपातकाल हो सकता है। एम्बुलेंस के लिए SOS भेजें या अभी 108 पर कॉल करें।",
  urgency: { Low: "कम गंभीर", Medium: "मध्यम गंभीर", High: "अधिक गंभीर", Emergency: "आपातकाल" },
  action: {
    SelfCare: "घर पर आराम और देखभाल पर्याप्त होनी चाहिए।",
    BookAppointment: "कृपया अगले कुछ दिनों में डॉक्टर को दिखाएं।",
    VisitPHC: "कृपया आज ही नज़दीकी पीएचसी/अस्पताल जाएं।",
    Teleconsult: "डॉक्टर से फ़ोन/वीडियो सलाह लें - ऐप में बुक करें या आशा से पूछें।",
    CallAmbulance: "एम्बुलेंस के लिए अभी SOS भेजें या 108 पर कॉल करें।",
  },
  noAppointments: "स्वास्थ्य सेतु: आपका कोई आगामी अपॉइंटमेंट नहीं है।",
  appointmentsHeader: "स्वास्थ्य सेतु अपॉइंटमेंट:",
  noAmbulance: "स्वास्थ्य सेतु: कोई एम्बुलेंस अनुरोध नहीं मिला।",
  ambulanceStatus: (id, status) => `स्वास्थ्य सेतु: एम्बुलेंस अनुरोध #${id} - ${hi.statusLabel[status]}।`,
  statusLabel: {
    Requested: "एम्बुलेंस की प्रतीक्षा",
    Dispatched: "एम्बुलेंस रास्ते में है",
    Completed: "पूरा हुआ",
    Cancelled: "रद्द",
  },
  contactAlert: (name, id) =>
    `स्वास्थ्य सेतु सूचना: ${name} ने आपातकालीन एम्बुलेंस मांगी है (अनुरोध #${id})। कृपया उनसे संपर्क करें या 108 पर कॉल करें।`,
  bookingConfirmed: (doctor, when, mode) => `स्वास्थ्य सेतु: डॉ. ${doctor} के साथ ${mode} ${when} के लिए बुक हुआ।`,
  ussdMain: "स्वास्थ्य सेतु\n1. आपातकालीन एम्बुलेंस\n2. लक्षण जांच\n3. मेरे अपॉइंटमेंट\n4. एम्बुलेंस स्थिति",
  ussdConfirmSos: "अभी आपके पंजीकृत गांव में एम्बुलेंस भेजें?\n1. हां\n2. नहीं",
  ussdCancelled: "रद्द किया गया। आपातकाल में 108 पर कॉल करें।",
  ussdChooseSymptom: "मुख्य समस्या:",
  ussdEmergencyConfirm: "यह आपातकाल हो सकता है।\n1. अभी एम्बुलेंस भेजें\n2. नहीं",
  ussdInvalid: "गलत विकल्प। कृपया फिर से प्रयास करें।",
  ussdSymptoms: [
    ["fever_high", "बुखार"],
    ["cough_cold", "खांसी/जुकाम"],
    ["vomiting_diarrhea", "उल्टी/दस्त"],
    ["breathing_difficulty", "सांस की दिक्कत"],
    ["chest_pain", "छाती में दर्द"],
    ["heavy_bleeding", "अधिक खून"],
    ["unconscious_unresponsive", "बेहोशी/दौरा"],
    ["severe_injury", "चोट/दुर्घटना"],
    ["pregnancy_danger", "गर्भावस्था समस्या"],
  ],
  ivrWelcome:
    "स्वास्थ्य सेतु में आपका स्वागत है। आपातकालीन एम्बुलेंस के लिए 1 दबाएं या आपातकाल बोलें। लक्षण जांच के लिए 2 दबाएं, या अभी अपनी समस्या बताएं।",
  ivrDescribe: "कृपया अभी अपनी स्वास्थ्य समस्या बताएं।",
  ivrNotUnderstood: "माफ़ कीजिए, मैं समझ नहीं पाया।",
  ivrGoodbye: "अपना ध्यान रखें। नमस्ते।",
  ivrNotRegistered:
    "यह नंबर स्वास्थ्य सेतु में पंजीकृत नहीं है। आपातकाल में 108 पर कॉल करें, या अपनी आशा कार्यकर्ता से पंजीकरण करवाएं।",
  ivrAmbulanceOffer: "अभी एम्बुलेंस भेजने के लिए 1 दबाएं।",
};

const gu: TelecomTexts = {
  smsMenu:
    "સ્વાસ્થ્ય સેતુ: SOS = એમ્બ્યુલન્સ. CHECK <લક્ષણો> = લક્ષણ તપાસ. APPT = તમારી એપોઇન્ટમેન્ટ. STATUS = એમ્બ્યુલન્સની સ્થિતિ. જોખમમાં 108 પર કૉલ કરો.",
  notRegistered:
    "સ્વાસ્થ્ય સેતુ: આ નંબર નોંધાયેલ નથી. તમારી આશા કાર્યકર પાસે નોંધણી કરાવો. કટોકટીમાં હમણાં 108 પર કૉલ કરો.",
  ambulanceSent: (id) =>
    `સ્વાસ્થ્ય સેતુ: એમ્બ્યુલન્સ વિનંતી #${id} મોકલાઈ. જ્યાં છો ત્યાં જ રહો અને ફોન ચાલુ રાખો. જીવનું જોખમ હોય તો 108 પર પણ કૉલ કરો.`,
  ambulanceFailed: "સ્વાસ્થ્ય સેતુ: એમ્બ્યુલન્સ વિનંતી મોકલી શકાઈ નહીં. હમણાં 108 પર કૉલ કરો.",
  emergencyPrompt: "આ કટોકટી હોઈ શકે છે. એમ્બ્યુલન્સ માટે SOS મોકલો અથવા હમણાં 108 પર કૉલ કરો.",
  urgency: { Low: "ઓછું ગંભીર", Medium: "મધ્યમ ગંભીર", High: "વધુ ગંભીર", Emergency: "કટોકટી" },
  action: {
    SelfCare: "ઘરે આરામ અને સ્વ-સંભાળ પૂરતી હોવી જોઈએ.",
    BookAppointment: "કૃપા કરીને આગામી થોડા દિવસોમાં ડોક્ટરને બતાવો.",
    VisitPHC: "કૃપા કરીને આજે જ નજીકના પીએચસી/હોસ્પિટલ જાઓ.",
    Teleconsult: "ડોક્ટર સાથે ફોન/વિડિયો પરામર્શ કરો - એપમાં બુક કરો અથવા આશાને પૂછો.",
    CallAmbulance: "એમ્બ્યુલન્સ માટે હમણાં SOS મોકલો અથવા 108 પર કૉલ કરો.",
  },
  noAppointments: "સ્વાસ્થ્ય સેતુ: તમારી કોઈ આગામી એપોઇન્ટમેન્ટ નથી.",
  appointmentsHeader: "સ્વાસ્થ્ય સેતુ એપોઇન્ટમેન્ટ:",
  noAmbulance: "સ્વાસ્થ્ય સેતુ: કોઈ એમ્બ્યુલન્સ વિનંતી મળી નથી.",
  ambulanceStatus: (id, status) => `સ્વાસ્થ્ય સેતુ: એમ્બ્યુલન્સ વિનંતી #${id} - ${gu.statusLabel[status]}.`,
  statusLabel: {
    Requested: "એમ્બ્યુલન્સની રાહ",
    Dispatched: "એમ્બ્યુલન્સ રસ્તામાં છે",
    Completed: "પૂર્ણ",
    Cancelled: "રદ",
  },
  contactAlert: (name, id) =>
    `સ્વાસ્થ્ય સેતુ સૂચના: ${name} એ કટોકટી એમ્બ્યુલન્સ માંગી છે (વિનંતી #${id}). કૃપા કરીને તેમનો સંપર્ક કરો અથવા 108 પર કૉલ કરો.`,
  bookingConfirmed: (doctor, when, mode) => `સ્વાસ્થ્ય સેતુ: ડૉ. ${doctor} સાથે ${mode} ${when} માટે બુક થયું.`,
  ussdMain: "સ્વાસ્થ્ય સેતુ\n1. કટોકટી એમ્બ્યુલન્સ\n2. લક્ષણ તપાસ\n3. મારી એપોઇન્ટમેન્ટ\n4. એમ્બ્યુલન્સ સ્થિતિ",
  ussdConfirmSos: "હમણાં તમારા નોંધાયેલ ગામમાં એમ્બ્યુલન્સ મોકલીએ?\n1. હા\n2. ના",
  ussdCancelled: "રદ કર્યું. કટોકટીમાં 108 પર કૉલ કરો.",
  ussdChooseSymptom: "મુખ્ય સમસ્યા:",
  ussdEmergencyConfirm: "આ કટોકટી હોઈ શકે છે.\n1. હમણાં એમ્બ્યુલન્સ મોકલો\n2. ના",
  ussdInvalid: "ખોટો વિકલ્પ. કૃપા કરીને ફરી પ્રયાસ કરો.",
  ussdSymptoms: [
    ["fever_high", "તાવ"],
    ["cough_cold", "ઉધરસ/શરદી"],
    ["vomiting_diarrhea", "ઉલટી/ઝાડા"],
    ["breathing_difficulty", "શ્વાસની તકલીફ"],
    ["chest_pain", "છાતીમાં દુખાવો"],
    ["heavy_bleeding", "વધુ રક્તસ્ત્રાવ"],
    ["unconscious_unresponsive", "બેભાન/આંચકી"],
    ["severe_injury", "ઈજા/અકસ્માત"],
    ["pregnancy_danger", "ગર્ભાવસ્થા સમસ્યા"],
  ],
  ivrWelcome:
    "સ્વાસ્થ્ય સેતુમાં આપનું સ્વાગત છે. કટોકટી એમ્બ્યુલન્સ માટે 1 દબાવો અથવા કટોકટી બોલો. લક્ષણ તપાસ માટે 2 દબાવો, અથવા હમણાં તમારી સમસ્યા જણાવો.",
  ivrDescribe: "કૃપા કરીને હમણાં તમારી આરોગ્ય સમસ્યા જણાવો.",
  ivrNotUnderstood: "માફ કરશો, હું સમજી શક્યો નહીં.",
  ivrGoodbye: "તમારું ધ્યાન રાખો. આવજો.",
  ivrNotRegistered:
    "આ નંબર સ્વાસ્થ્ય સેતુમાં નોંધાયેલ નથી. કટોકટીમાં 108 પર કૉલ કરો, અથવા તમારી આશા કાર્યકર પાસે નોંધણી કરાવો.",
  ivrAmbulanceOffer: "હમણાં એમ્બ્યુલન્સ મોકલવા માટે 1 દબાવો.",
};

const TEXTS: Record<Locale, TelecomTexts> = { en, hi, gu };

export function telecomTexts(locale: Locale): TelecomTexts {
  return TEXTS[locale] ?? en;
}

// Speech recognition / text-to-speech language tags, shared by the
// browser voice features and Twilio <Gather>/<Say>.
export const SPEECH_LANG: Record<Locale, string> = { en: "en-IN", hi: "hi-IN", gu: "gu-IN" };

// Closing line whenever an IVR call ends without a platform request.
export const IVR_CALL_108: Record<Locale, string> = {
  en: "If this is an emergency, please call 108 now.",
  hi: "अगर यह आपातकाल है, तो कृपया अभी 108 पर कॉल करें।",
  gu: "જો આ કટોકટી હોય, તો કૃપા કરીને હમણાં 108 પર કૉલ કરો.",
};
