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

export const locales = ["en", "hi", "gu"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";
export const LOCALE_COOKIE = "NEXT_LOCALE";

export const dictionaries = {
  en: {
    "app.name": "Swasthsetu",
    "lang.switch": "Language",
    "lang.en": "English",
    "lang.hi": "Hindi",
    "lang.gu": "Gujarati",

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

    "nav.healthIndex": "Public Health Index",

    "voice.speak": "Speak",
    "voice.stop": "Stop listening",
    "voice.listening": "Listening...",
    "voice.unsupported":
      "Voice input isn't available in this browser - use Chrome, or call the Swasthsetu voice line from any phone.",
    "voice.denied":
      "Microphone is blocked for this site. Click the lock / site-settings icon left of the address bar, set Microphone to Allow, then reload the page. On Windows also check Settings > Privacy & security > Microphone.",
    "voice.insecure":
      "Voice needs a secure connection. Open the app on localhost or an https:// address (not a plain http:// IP address).",
    "voice.noMic": "No microphone was found. Connect one, or type your symptoms instead.",
    "voice.network": "Voice recognition needs an internet connection.",
    "voice.error": "Couldn't hear that - please try again.",
    "voice.readAloud": "Read aloud",
    "voice.describe": "Speak your symptoms",

    "triage.describe": "Describe how you feel, in your own words",
    "triage.describePlaceholder": "e.g. fever for 3 days, headache, feeling very weak",
    "triage.analysing": "Checking your symptoms...",
    "triage.possibleConditions": "What it could be",
    "triage.selfCare": "What you can do now",
    "triage.redFlags": "Get urgent help if you notice",
    "triage.disclaimer": "This is guidance, not a diagnosis. A doctor will confirm.",
    "triage.engine.ai": "AI-assisted assessment, checked against safety rules.",
    "triage.engine.aiEscalated": "AI-assisted assessment - urgency raised by a safety rule.",
    "triage.engine.rules": "Rule-based assessment.",
    "triage.engine.rulesFallback": "AI assessment is unavailable right now - showing the rule-based result.",
    "triage.urgency.Low": "Low urgency",
    "triage.urgency.Medium": "Medium urgency",
    "triage.urgency.High": "High urgency",
    "triage.urgency.Emergency": "Emergency",
    "triage.bookInPerson": "Book in-person visit",
    "triage.bookVideo": "Book video consult",
    "triage.bookVoice": "Book voice consult",

    "emergency.flagged": "Your symptom check shows this may be an emergency. Request an ambulance now.",
    "emergency.whileWaiting": "While you wait",
    "emergency.voiceTitle": "Voice SOS",
    "emergency.voiceHelp":
      "Tap the button and say \"help\", \"ambulance\" or what is wrong. The request is sent as soon as an emergency is heard.",
    "emergency.voiceStart": "Start voice SOS",
    "emergency.heard": "Heard",
    "emergency.call108": "Call 108 (national ambulance)",
    "emergency.sentTitle": "Ambulance request sent",
    "emergency.sentBody":
      "The nearest available ambulance provider has been notified, and your emergency contact gets an SMS. Stay where you are if possible.",
    "emergency.sentSpoken":
      "Your ambulance request has been sent. Stay where you are. If it is life threatening, also call 108.",
    "emergency.choosePatient": "Choose the patient who needs the ambulance",
  },
  hi: {
    "app.name": "स्वास्थ्य सेतु",
    "lang.switch": "भाषा",
    "lang.en": "अंग्रेज़ी",
    "lang.hi": "हिंदी",
    "lang.gu": "गुजराती",

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

    "nav.healthIndex": "जन स्वास्थ्य सूचकांक",

    "voice.speak": "बोलें",
    "voice.stop": "सुनना बंद करें",
    "voice.listening": "सुन रहे हैं...",
    "voice.unsupported":
      "इस ब्राउज़र में आवाज़ से इनपुट उपलब्ध नहीं है - Chrome इस्तेमाल करें, या किसी भी फ़ोन से स्वास्थ्य सेतु वॉइस लाइन पर कॉल करें।",
    "voice.denied":
      "इस साइट के लिए माइक्रोफ़ोन बंद है। पता-बार के बाईं ओर ताले / साइट-सेटिंग आइकन पर क्लिक करें, Microphone को Allow करें, फिर पेज रीलोड करें। Windows में Settings > Privacy & security > Microphone भी जांचें।",
    "voice.insecure":
      "आवाज़ के लिए सुरक्षित कनेक्शन चाहिए। ऐप को localhost या https:// पते पर खोलें (सादे http:// IP पते पर नहीं)।",
    "voice.noMic": "कोई माइक्रोफ़ोन नहीं मिला। माइक्रोफ़ोन लगाएं, या लक्षण लिखकर बताएं।",
    "voice.network": "आवाज़ पहचानने के लिए इंटरनेट कनेक्शन चाहिए।",
    "voice.error": "सुनाई नहीं दिया - कृपया फिर से कोशिश करें।",
    "voice.readAloud": "पढ़कर सुनाएं",
    "voice.describe": "अपने लक्षण बोलें",

    "triage.describe": "अपने शब्दों में बताएं कि आप कैसा महसूस कर रहे हैं",
    "triage.describePlaceholder": "जैसे 3 दिन से बुखार, सिरदर्द, बहुत कमजोरी",
    "triage.analysing": "लक्षणों की जांच हो रही है...",
    "triage.possibleConditions": "यह क्या हो सकता है",
    "triage.selfCare": "अभी आप क्या कर सकते हैं",
    "triage.redFlags": "ये दिखें तो तुरंत मदद लें",
    "triage.disclaimer": "यह सलाह है, निदान नहीं। डॉक्टर पुष्टि करेंगे।",
    "triage.engine.ai": "एआई की मदद से आकलन, सुरक्षा नियमों से जांचा गया।",
    "triage.engine.aiEscalated": "एआई की मदद से आकलन - सुरक्षा नियम ने गंभीरता बढ़ाई।",
    "triage.engine.rules": "नियम-आधारित आकलन।",
    "triage.engine.rulesFallback": "एआई आकलन अभी उपलब्ध नहीं है - नियम-आधारित परिणाम दिखाया जा रहा है।",
    "triage.urgency.Low": "कम गंभीर",
    "triage.urgency.Medium": "मध्यम गंभीर",
    "triage.urgency.High": "अधिक गंभीर",
    "triage.urgency.Emergency": "आपातकाल",
    "triage.bookInPerson": "क्लिनिक विज़िट बुक करें",
    "triage.bookVideo": "वीडियो सलाह बुक करें",
    "triage.bookVoice": "वॉइस सलाह बुक करें",

    "emergency.flagged": "आपकी लक्षण जांच के अनुसार यह आपातकाल हो सकता है। अभी एम्बुलेंस के लिए अनुरोध करें।",
    "emergency.whileWaiting": "इंतज़ार करते समय",
    "emergency.voiceTitle": "वॉइस SOS",
    "emergency.voiceHelp":
      "बटन दबाएं और \"मदद\", \"एम्बुलेंस\" या क्या हुआ है बोलें। आपातकाल सुनते ही अनुरोध भेज दिया जाएगा।",
    "emergency.voiceStart": "वॉइस SOS शुरू करें",
    "emergency.heard": "सुना गया",
    "emergency.call108": "108 पर कॉल करें (राष्ट्रीय एम्बुलेंस)",
    "emergency.sentTitle": "एम्बुलेंस अनुरोध भेजा गया",
    "emergency.sentBody":
      "निकटतम उपलब्ध एम्बुलेंस को सूचित कर दिया गया है, और आपके आपातकालीन संपर्क को SMS भेजा गया है। हो सके तो जहां हैं वहीं रहें।",
    "emergency.sentSpoken":
      "आपका एम्बुलेंस अनुरोध भेज दिया गया है। जहां हैं वहीं रहें। जान का खतरा हो तो 108 पर भी कॉल करें।",
    "emergency.choosePatient": "उस मरीज़ को चुनें जिसे एम्बुलेंस चाहिए",
  },
  gu: {
    "app.name": "સ્વાસ્થ્ય સેતુ",
    "lang.switch": "ભાષા",
    "lang.en": "અંગ્રેજી",
    "lang.hi": "હિન્દી",
    "lang.gu": "ગુજરાતી",

    "nav.dashboard": "ડેશબોર્ડ",
    "nav.appointments": "એપોઇન્ટમેન્ટ",
    "nav.book": "એપોઇન્ટમેન્ટ બુક કરો",
    "nav.profile": "પ્રોફાઇલ",
    "nav.availability": "ઉપલબ્ધતા",
    "nav.triage": "લક્ષણ તપાસ",
    "nav.queue": "કતારની સ્થિતિ",
    "nav.emergency": "કટોકટી",
    "nav.schemes": "આરોગ્ય યોજનાઓ",
    "nav.feedback": "પ્રતિસાદ",
    "nav.medicineSearch": "દવા શોધો",
    "nav.registerPatient": "દર્દી નોંધો",
    "nav.visits": "ફિલ્ડ મુલાકાત",
    "nav.directory": "ગામ/હોસ્પિટલ ડિરેક્ટરી",
    "nav.referrals": "રેફરલ્સ",
    "nav.labOrders": "લેબ ઓર્ડર",
    "nav.pharmacyStock": "દવા સ્ટોક",
    "nav.ambulanceRequests": "એમ્બ્યુલન્સ વિનંતીઓ",
    "nav.reports": "અહેવાલો",

    "landing.title": "દરેક ગામ માટે આરોગ્ય સેવાની પહોંચ",
    "landing.subtitle":
      "ડોક્ટરની મુલાકાત બુક કરો, લક્ષણોની તપાસ કરાવો, એમ્બ્યુલન્સ માટે વિનંતી કરો, અને તમારા આરોગ્ય રેકોર્ડ ટ્રેક કરો - તમારી ભાષામાં.",
    "landing.signup": "ખાતું બનાવો",
    "landing.login": "સાઇન ઇન કરો",

    "auth.login.title": "સાઇન ઇન કરો",
    "auth.signup.title": "તમારું ખાતું બનાવો",
    "auth.role.label": "હું છું...",

    "triage.title": "લક્ષણ તપાસ",
    "triage.subtitle":
      "આગળ શું કરવું તે જાણવા માટે થોડા પ્રશ્નોના જવાબ આપો. આ ડોક્ટરની સલાહનો વિકલ્પ નથી.",
    "triage.submit": "લક્ષણો તપાસો",
    "triage.result.SelfCare": "હાલ પૂરતું ઘરે સ્વ-સંભાળ પૂરતી હોવી જોઈએ.",
    "triage.result.BookAppointment": "કૃપા કરીને ડોક્ટર સાથે નિયમિત એપોઇન્ટમેન્ટ બુક કરો.",
    "triage.result.VisitPHC": "કૃપા કરીને ટૂંક સમયમાં તમારા નજીકના પીએચસી/હોસ્પિટલની મુલાકાત લો.",
    "triage.result.Teleconsult": "હમણાં ડોક્ટર સાથે વિડિયો પરામર્શ શરૂ કરો.",
    "triage.result.CallAmbulance": "આ તાત્કાલિક લાગે છે - હમણાં એમ્બ્યુલન્સ માટે વિનંતી કરો.",

    "emergency.title": "કટોકટી",
    "emergency.callAmbulance": "એમ્બ્યુલન્સ માટે વિનંતી કરો",
    "emergency.subtitle": "અમે તમારું સ્થાન નજીકની ઉપલબ્ધ એમ્બ્યુલન્સ સાથે શેર કરીશું.",

    "schemes.title": "સરકારી આરોગ્ય યોજનાઓ",
    "schemes.eligibility": "પાત્રતા",

    "queue.title": "કતારની સ્થિતિ",
    "queue.yourToken": "તમારો ટોકન નંબર",
    "queue.waiting": "રાહ જોઈ રહ્યાં છીએ",
    "queue.called": "તમને બોલાવવામાં આવી રહ્યા છે - કૃપા કરીને કાઉન્ટર પર જાઓ",

    "common.save": "સાચવો",
    "common.cancel": "રદ કરો",
    "common.submit": "સબમિટ કરો",
    "common.loading": "લોડ થઈ રહ્યું છે...",

    "nav.healthIndex": "જાહેર આરોગ્ય સૂચકાંક",

    "voice.speak": "બોલો",
    "voice.stop": "સાંભળવાનું બંધ કરો",
    "voice.listening": "સાંભળી રહ્યા છીએ...",
    "voice.unsupported":
      "આ બ્રાઉઝરમાં અવાજથી ઇનપુટ ઉપલબ્ધ નથી - Chrome વાપરો, અથવા કોઈપણ ફોનથી સ્વાસ્થ્ય સેતુ વૉઇસ લાઇન પર કૉલ કરો.",
    "voice.denied":
      "આ સાઇટ માટે માઇક્રોફોન બંધ છે. સરનામા-બારની ડાબી બાજુના તાળા / સાઇટ-સેટિંગ આઇકન પર ક્લિક કરો, Microphone ને Allow કરો, પછી પેજ રીલોડ કરો. Windows માં Settings > Privacy & security > Microphone પણ તપાસો.",
    "voice.insecure":
      "અવાજ માટે સુરક્ષિત કનેક્શન જરૂરી છે. એપને localhost અથવા https:// સરનામા પર ખોલો (સાદા http:// IP સરનામા પર નહીં).",
    "voice.noMic": "કોઈ માઇક્રોફોન મળ્યો નહીં. માઇક્રોફોન જોડો, અથવા લક્ષણો લખીને જણાવો.",
    "voice.network": "અવાજ ઓળખવા માટે ઇન્ટરનેટ કનેક્શન જરૂરી છે.",
    "voice.error": "સંભળાયું નહીં - કૃપા કરીને ફરી પ્રયાસ કરો.",
    "voice.readAloud": "વાંચીને સંભળાવો",
    "voice.describe": "તમારા લક્ષણો બોલો",

    "triage.describe": "તમારા શબ્દોમાં જણાવો કે તમને કેવું લાગે છે",
    "triage.describePlaceholder": "જેમ કે 3 દિવસથી તાવ, માથાનો દુખાવો, ખૂબ નબળાઈ",
    "triage.analysing": "લક્ષણોની તપાસ થઈ રહી છે...",
    "triage.possibleConditions": "આ શું હોઈ શકે",
    "triage.selfCare": "હમણાં તમે શું કરી શકો",
    "triage.redFlags": "આ દેખાય તો તરત મદદ લો",
    "triage.disclaimer": "આ માર્ગદર્શન છે, નિદાન નથી. ડોક્ટર પુષ્ટિ કરશે.",
    "triage.engine.ai": "એઆઈની મદદથી મૂલ્યાંકન, સલામતી નિયમોથી ચકાસાયેલ.",
    "triage.engine.aiEscalated": "એઆઈની મદદથી મૂલ્યાંકન - સલામતી નિયમે ગંભીરતા વધારી.",
    "triage.engine.rules": "નિયમ-આધારિત મૂલ્યાંકન.",
    "triage.engine.rulesFallback": "એઆઈ મૂલ્યાંકન હાલ ઉપલબ્ધ નથી - નિયમ-આધારિત પરિણામ બતાવી રહ્યા છીએ.",
    "triage.urgency.Low": "ઓછું ગંભીર",
    "triage.urgency.Medium": "મધ્યમ ગંભીર",
    "triage.urgency.High": "વધુ ગંભીર",
    "triage.urgency.Emergency": "કટોકટી",
    "triage.bookInPerson": "ક્લિનિક મુલાકાત બુક કરો",
    "triage.bookVideo": "વિડિયો પરામર્શ બુક કરો",
    "triage.bookVoice": "વૉઇસ પરામર્શ બુક કરો",

    "emergency.flagged": "તમારી લક્ષણ તપાસ મુજબ આ કટોકટી હોઈ શકે છે. હમણાં એમ્બ્યુલન્સ માટે વિનંતી કરો.",
    "emergency.whileWaiting": "રાહ જોતી વખતે",
    "emergency.voiceTitle": "વૉઇસ SOS",
    "emergency.voiceHelp":
      "બટન દબાવો અને \"મદદ\", \"એમ્બ્યુલન્સ\" અથવા શું થયું છે તે બોલો. કટોકટી સંભળાતા જ વિનંતી મોકલાશે.",
    "emergency.voiceStart": "વૉઇસ SOS શરૂ કરો",
    "emergency.heard": "સંભળાયું",
    "emergency.call108": "108 પર કૉલ કરો (રાષ્ટ્રીય એમ્બ્યુલન્સ)",
    "emergency.sentTitle": "એમ્બ્યુલન્સ વિનંતી મોકલાઈ",
    "emergency.sentBody":
      "નજીકની ઉપલબ્ધ એમ્બ્યુલન્સને જાણ કરવામાં આવી છે, અને તમારા કટોકટી સંપર્કને SMS મોકલાયો છે. શક્ય હોય તો જ્યાં છો ત્યાં જ રહો.",
    "emergency.sentSpoken":
      "તમારી એમ્બ્યુલન્સ વિનંતી મોકલાઈ ગઈ છે. જ્યાં છો ત્યાં જ રહો. જીવનું જોખમ હોય તો 108 પર પણ કૉલ કરો.",
    "emergency.choosePatient": "જેને એમ્બ્યુલન્સની જરૂર છે તે દર્દી પસંદ કરો",
  },
} as const satisfies Record<Locale, Record<string, string>>;

export type DictionaryKey = keyof typeof dictionaries.en;
