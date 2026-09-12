import { telecomTexts } from "@/lib/telecom/messages";
import { logTelecomMessage } from "@/lib/telecom/sms";
import { callbackUrl, gather, redirectTo, say, twimlResponse } from "@/lib/telecom/twiml";
import { readFormParams, verifyTelecomWebhook } from "@/lib/telecom/verify";
import { findPatientByPhone } from "@/lib/telecom/service";

// Voice line for rural emergencies - the "voice model" for people on
// keypad phones or who can't read. Point a Twilio number's "A call comes
// in" webhook here. The caller is greeted in their registered language
// and can press a key or simply speak (Twilio speech recognition in
// en-IN / hi-IN / gu-IN); /api/ivr/gather handles what they said.
export async function POST(request: Request) {
  const params = await readFormParams(request);
  const verification = verifyTelecomWebhook(request, params);
  if (!verification.ok) {
    return new Response(verification.message, { status: verification.status });
  }

  const from = params.From ?? "";
  const patient = await findPatientByPhone(from);

  await logTelecomMessage({
    direction: "Inbound",
    channel: "IVR",
    phone: from,
    body: "[incoming call]",
    status: "Received",
    profileId: patient?.profileId,
    provider: "twilio",
    providerMessageId: params.CallSid,
  });

  if (!patient) {
    // Language unknown for an unregistered caller - say it in English and Hindi.
    return twimlResponse(
      say(telecomTexts("en").ivrNotRegistered, "en"),
      say(telecomTexts("hi").ivrNotRegistered, "hi"),
      "<Hangup/>"
    );
  }

  const next = callbackUrl(request, "/api/ivr/gather", { step: "menu", attempt: "1" });
  return twimlResponse(
    gather({ action: next, locale: patient.locale, prompt: telecomTexts(patient.locale).ivrWelcome }),
    // Reached only if the caller says nothing - the gather step treats
    // missing input as "didn't understand" and retries once.
    redirectTo(next)
  );
}
