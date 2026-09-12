import Link from "next/link";

// Shown by the service worker (public/sw.js) when a page is opened with
// no connection. Deliberately static and self-contained: it is cached
// at install time, so it can't read the locale cookie or hit the
// database - it says the same thing in all four languages at once, and
// repeats the emergency number, because "no signal" is exactly when
// someone needs to be told to ring 108.
export const dynamic = "force-static";

const MESSAGES = [
  {
    lang: "en",
    title: "You're offline",
    body: "Swasthsetu needs a connection for this page. Anything you saved on this device - like an ASHA field visit - is safe and will sync by itself once you have a signal.",
    emergency: "In an emergency, call 108 for an ambulance.",
  },
  {
    lang: "hi",
    title: "आप ऑफ़लाइन हैं",
    body: "इस पेज के लिए इंटरनेट ज़रूरी है। इस डिवाइस पर सहेजी गई जानकारी - जैसे आशा की फील्ड विज़िट - सुरक्षित है और नेटवर्क आते ही अपने आप सिंक हो जाएगी।",
    emergency: "आपात स्थिति में एम्बुलेंस के लिए 108 पर कॉल करें।",
  },
  {
    lang: "gu",
    title: "તમે ઑફલાઇન છો",
    body: "આ પેજ માટે ઇન્ટરનેટ જરૂરી છે. આ ડિવાઇસ પર સાચવેલી માહિતી - જેમ કે આશાની ફીલ્ડ મુલાકાત - સુરક્ષિત છે અને નેટવર્ક મળતાં જ આપોઆપ સિંક થશે.",
    emergency: "કટોકટીમાં એમ્બ્યુલન્સ માટે 108 પર કૉલ કરો.",
  },
  {
    lang: "mr",
    title: "तुम्ही ऑफलाइन आहात",
    body: "या पेजसाठी इंटरनेट आवश्यक आहे. या डिव्हाइसवर जतन केलेली माहिती - जसे की आशाची फील्ड भेट - सुरक्षित आहे आणि नेटवर्क आल्यावर आपोआप सिंक होईल.",
    emergency: "आणीबाणीत रुग्णवाहिकेसाठी 108 वर कॉल करा.",
  },
];

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 px-6 py-16">
      <a
        href="tel:108"
        className="rounded-md bg-danger-solid px-4 py-3 text-center text-lg font-semibold text-white"
      >
        108
      </a>

      {MESSAGES.map((message) => (
        <div key={message.lang} lang={message.lang} className="border-t border-line pt-4 first:border-0 first:pt-0">
          <h1 className="text-lg font-semibold text-ink">{message.title}</h1>
          <p className="mt-1 text-sm text-ink/70">{message.body}</p>
          <p className="mt-1 text-sm font-medium text-danger">{message.emergency}</p>
        </div>
      ))}

      <Link href="/" className="text-sm font-medium text-teal-600">
        Try again / फिर से कोशिश करें
      </Link>
    </main>
  );
}
