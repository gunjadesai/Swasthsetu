import type { Locale } from "@/lib/i18n/dictionaries";
import { SPEECH_LANG } from "./messages";

// Minimal TwiML builders for the SMS and IVR webhooks - a handful of
// verbs doesn't justify pulling in the Twilio SDK.

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Google's Indian-English, Hindi, Gujarati and Marathi voices on Twilio.
const VOICE: Record<Locale, string> = {
  en: "Google.en-IN-Standard-A",
  hi: "Google.hi-IN-Standard-A",
  gu: "Google.gu-IN-Standard-A",
  mr: "Google.mr-IN-Standard-A",
};

export function say(text: string, locale: Locale): string {
  return `<Say language="${SPEECH_LANG[locale]}" voice="${VOICE[locale]}">${escapeXml(text)}</Say>`;
}

// Accepts a keypad press OR speech - the caller can press 1 or just say
// "emergency" / "bachao" / describe their symptoms in their language.
export function gather(input: { action: string; locale: Locale; prompt: string; timeoutSeconds?: number }): string {
  return [
    `<Gather input="speech dtmf" numDigits="1" timeout="${input.timeoutSeconds ?? 6}" speechTimeout="auto"`,
    ` language="${SPEECH_LANG[input.locale]}" action="${escapeXml(input.action)}" method="POST">`,
    say(input.prompt, input.locale),
    "</Gather>",
  ].join("");
}

export function redirectTo(url: string): string {
  return `<Redirect method="POST">${escapeXml(url)}</Redirect>`;
}

export function twimlDocument(...verbs: string[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?><Response>${verbs.join("")}</Response>`;
}

export function twimlResponse(...verbs: string[]): Response {
  return new Response(twimlDocument(...verbs), {
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

// Relative callback URL for the next IVR step. Carries ?key= forward when
// the call was authenticated by shared secret rather than a signature.
export function callbackUrl(request: Request, path: string, query: Record<string, string> = {}): string {
  const params = new URLSearchParams(query);
  const key = new URL(request.url).searchParams.get("key");
  if (key) params.set("key", key);
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}
