// Lightweight custom i18n - no next-intl, no /[locale]/ route
// restructuring (see progress.md Decisions Log for why). Just a flat
// key -> string table per supported locale, read via get-dictionary.ts
// and a NEXT_LOCALE cookie set by components/language-switcher.tsx.
//
// This does not cover every string in the app - it covers the nav,
// landing/auth pages, and the flows the SIH evaluator's own notes
// singled out (triage, emergency, health schemes) where testing real
// bilingual behaviour actually matters. Add keys here as you localize
// more pages; anything missing falls back to English via t().

export const locales = ["en", "hi"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";
export const LOCALE_COOKIE = "NEXT_LOCALE";

export const dictionaries = {
  en: {
    "app.name": "Rural Health",
    "lang.switch": "Language",
    "lang.en": "English",
    "lang.hi": "Hindi",

    "nav.dashboard": "Dashboard",
    "nav.appointments": "Appointments",
    "nav.book": "Book Appointment",
    "nav.profile": "Profile",
    "nav.availability": "Availability",
    "nav.triage": "Symptom Checker",
    "nav.queue": "Queue Status",
    "nav.emergency": "Emergency",
    "nav.schemes": "Health Schemes",
    "nav.feedback": "Feedback",
    "nav.medicineSearch": "Find Medicine",
    "nav.registerPatient": "Register a Patient",
    "nav.visits": "Field Visits",
    "nav.directory": "Village/Hospital Directory",
    "nav.referrals": "Referrals",
    "nav.labOrders": "Lab Orders",
    "nav.pharmacyStock": "Medicine Stock",
    "nav.ambulanceRequests": "Ambulance Requests",
    "nav.reports": "Reports",

    "landing.title": "Healthcare access for every village",
    "landing.subtitle":
      "Book doctor visits, get triaged, request an ambulance, and track your health records - in your language.",
    "landing.signup": "Create account",
    "landing.login": "Sign in",

    "auth.login.title": "Sign in",
    "auth.signup.title": "Create your account",
    "auth.role.label": "I am a...",

    "triage.title": "Symptom Checker",
    "triage.subtitle":
      "Answer a few questions to find out what to do next. This does not replace a doctor's advice.",
    "triage.submit": "Check symptoms",
    "triage.result.SelfCare": "Self-care at home should be enough for now.",
    "triage.result.BookAppointment": "Please book a regular appointment with a doctor.",
    "triage.result.VisitPHC": "Please visit your nearest PHC/hospital soon.",
    "triage.result.Teleconsult": "Start a video consultation with a doctor now.",
    "triage.result.CallAmbulance": "This looks urgent - request an ambulance now.",

    "emergency.title": "Emergency",
    "emergency.callAmbulance": "Request an Ambulance",
    "emergency.subtitle": "We'll share your location with the nearest available ambulance.",

    "schemes.title": "Government Health Schemes",
    "schemes.eligibility": "Eligibility",

    "queue.title": "Queue Status",
    "queue.yourToken": "Your token number",
    "queue.waiting": "Waiting",
    "queue.called": "You're being called - please go to the counter",

    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.submit": "Submit",
    "common.loading": "Loading...",
  },
  hi: {
    "app.name": "ग्रामीण स्वास्थ्य",
    "lang.switch": "भाषा",
    "lang.en": "अंग्रेज़ी",
    "lang.hi": "हिंदी",

    "nav.dashboard": "डैशबोर्ड",
    "nav.appointments": "अपॉइंटमेंट",
    "nav.book": "अपॉइंटमेंट बुक करें",
    "nav.profile": "प्रोफ़ाइल",
    "nav.availability": "उपलब्धता",
    "nav.triage": "लक्षण जांच",
    "nav.queue": "कतार की स्थिति",
    "nav.emergency": "आपातकाल",
    "nav.schemes": "स्वास्थ्य योजनाएं",
    "nav.feedback": "प्रतिक्रिया",
    "nav.medicineSearch": "दवा खोजें",
    "nav.registerPatient": "मरीज़ को दर्ज करें",
    "nav.visits": "फील्ड विज़िट",
    "nav.directory": "गांव/अस्पताल निर्देशिका",
    "nav.referrals": "रेफ़रल",
    "nav.labOrders": "लैब जांच",
    "nav.pharmacyStock": "दवा स्टॉक",
    "nav.ambulanceRequests": "एम्बुलेंस अनुरोध",
    "nav.reports": "रिपोर्ट",

    "landing.title": "हर गांव के लिए स्वास्थ्य सेवा",
    "landing.subtitle":
      "डॉक्टर से अपॉइंटमेंट लें, लक्षणों की जांच करें, एम्बुलेंस बुलाएं, और अपने स्वास्थ्य रिकॉर्ड देखें - अपनी भाषा में।",
    "landing.signup": "खाता बनाएं",
    "landing.login": "साइन इन करें",

    "auth.login.title": "साइन इन करें",
    "auth.signup.title": "अपना खाता बनाएं",
    "auth.role.label": "मैं हूँ...",

    "triage.title": "लक्षण जांच",
    "triage.subtitle":
      "आगे क्या करना है यह जानने के लिए कुछ सवालों के जवाब दें। यह डॉक्टर की सलाह का विकल्प नहीं है।",
    "triage.submit": "लक्षण जांचें",
    "triage.result.SelfCare": "अभी घर पर देखभाल पर्याप्त होनी चाहिए।",
    "triage.result.BookAppointment": "कृपया डॉक्टर के साथ एक सामान्य अपॉइंटमेंट बुक करें।",
    "triage.result.VisitPHC": "कृपया शीघ्र ही अपने नज़दीकी पीएचसी/अस्पताल जाएं।",
    "triage.result.Teleconsult": "अभी डॉक्टर के साथ वीडियो सलाह शुरू करें।",
    "triage.result.CallAmbulance": "यह गंभीर लगता है - अभी एम्बुलेंस के लिए अनुरोध करें।",

    "emergency.title": "आपातकाल",
    "emergency.callAmbulance": "एम्बुलेंस के लिए अनुरोध करें",
    "emergency.subtitle": "हम आपका स्थान निकटतम उपलब्ध एम्बुलेंस के साथ साझा करेंगे।",

    "schemes.title": "सरकारी स्वास्थ्य योजनाएं",
    "schemes.eligibility": "पात्रता",

    "queue.title": "कतार की स्थिति",
    "queue.yourToken": "आपका टोकन नंबर",
    "queue.waiting": "प्रतीक्षा में",
    "queue.called": "आपको बुलाया जा रहा है - कृपया काउंटर पर जाएं",

    "common.save": "सहेजें",
    "common.cancel": "रद्द करें",
    "common.submit": "जमा करें",
    "common.loading": "लोड हो रहा है...",
  },
} as const satisfies Record<Locale, Record<string, string>>;

export type DictionaryKey = keyof typeof dictionaries.en;
