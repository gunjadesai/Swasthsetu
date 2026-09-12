import { NextResponse } from "next/server";
import { runTriage } from "@/lib/ai-triage";
import { detectEmergencyPhrase } from "@/lib/triage";
import { telecomTexts } from "@/lib/telecom/messages";
import { logTelecomMessage } from "@/lib/telecom/sms";
import { escapeXml, twimlResponse } from "@/lib/telecom/twiml";
import { readFormParams, verifyTelecomWebhook } from "@/lib/telecom/verify";
import {
  createTelecomAmbulanceRequest,
  findPatientByPhone,
  latestAmbulanceStatusText,
  saveTelecomTriage,
  triageReplyText,
  upcomingAppointmentsText,
  type TelecomPatient,
} from "@/lib/telecom/service";

// Inbound SMS from keypad phones (Twilio "A message comes in" webhook, or
// any gateway that POSTs From + Body with the shared secret).
//
//   SOS / EMERGENCY / AMBULANCE / 108  -> ambulance request (village location)
//   CHECK <symptoms> - or just describe symptoms -> AI triage + advice
//   APPT                               -> upcoming appointments
//   STATUS                             -> latest ambulance request status
//   MENU / INFO / ?                    -> command list
//
// Replies are returned inline as TwiML <Message> (or JSON with ?format=json).

const SOS_COMMANDS = new Set(["SOS", "EMERGENCY", "AMBULANCE", "108", "HELPME"]);
const MENU_COMMANDS = new Set(["MENU", "INFO", "?", "COMMANDS", "START"]);
const APPT_COMMANDS = new Set(["APPT", "APPOINTMENT", "APPOINTMENTS"]);
const STATUS_COMMANDS = new Set(["STATUS"]);
const CHECK_COMMANDS = new Set(["CHECK", "SYMPTOM", "SYMPTOMS", "TRIAGE", "JANCH"]);

async function handleMessage(patient: TelecomPatient | null, body: string): Promise<string> {
  if (!patient) {
    return `${telecomTexts("en").notRegistered}\n${telecomTexts("hi").notRegistered}`;
  }

  const texts = telecomTexts(patient.locale);
  const words = body.split(/\s+/).filter(Boolean);
  const command = (words[0] ?? "").toUpperCase().replace(/[^A-Z0-9?]/g, "");

  if (!body || MENU_COMMANDS.has(command)) return texts.smsMenu;

  // A bare "SOS" or a short cry for help ("bachao", "madad karo") goes
  // straight to an ambulance; longer descriptions get triaged first.
  if (SOS_COMMANDS.has(command) || (words.length <= 3 && detectEmergencyPhrase(body))) {
    const requestId = await createTelecomAmbulanceRequest(patient, { channel: "SMS", notes: body });
    return requestId ? texts.ambulanceSent(requestId) : texts.ambulanceFailed;
  }

  if (APPT_COMMANDS.has(command)) return upcomingAppointmentsText(patient);
  if (STATUS_COMMANDS.has(command)) return latestAmbulanceStatusText(patient);

  const symptomText = CHECK_COMMANDS.has(command) ? words.slice(1).join(" ") : body;
  if (symptomText.trim().length < 3) return texts.smsMenu;

  const outcome = await runTriage({
    symptomKeys: [],
    freeText: symptomText,
    locale: patient.locale,
    channel: "SMS",
    patient: { age: patient.age, gender: patient.gender },
  });
  await saveTelecomTriage(patient, outcome, { channel: "SMS", freeText: symptomText });
  return triageReplyText(outcome, patient.locale);
}

export async function POST(request: Request) {
  const params = await readFormParams(request);
  const verification = verifyTelecomWebhook(request, params);
  if (!verification.ok) {
    return new Response(verification.message, { status: verification.status });
  }

  const from = params.From ?? params.from ?? "";
  const body = (params.Body ?? params.body ?? params.text ?? "").trim().slice(0, 1000);
  const provider = params.MessageSid ? "twilio" : "gateway";

  const patient = await findPatientByPhone(from);
  await logTelecomMessage({
    direction: "Inbound",
    channel: "SMS",
    phone: from,
    body,
    status: "Received",
    profileId: patient?.profileId,
    provider,
    providerMessageId: params.MessageSid,
  });

  const reply = await handleMessage(patient, body);

  await logTelecomMessage({
    direction: "Outbound",
    channel: "SMS",
    phone: from,
    body: reply,
    status: "Sent",
    profileId: patient?.profileId,
    provider: `${provider}-reply`,
  });

  if (new URL(request.url).searchParams.get("format") === "json") {
    return NextResponse.json({ reply });
  }
  return twimlResponse(`<Message>${escapeXml(reply)}</Message>`);
}
