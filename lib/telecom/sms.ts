import { createAdminClient } from "@/lib/supabase/admin";
import { encryptPHI } from "@/lib/phi-crypto";
import { toE164 } from "./phone";

// Outbound SMS and voice calls for keypad phones. Provider is pluggable
// via SMS_PROVIDER:
//   - "twilio": real delivery through Twilio's REST API (no SDK needed).
//   - anything else / unset: "console" - the message is logged and
//     recorded as Simulated, never silently marked Sent. Same honesty
//     rule the reminders dispatcher already follows.
// Indian carriers additionally require DLT-registered templates and a
// sender ID for A2P SMS; a DLT-approved gateway (MSG91, Gupshup, Exotel)
// slots in as another branch next to sendViaTwilio().
//
// Every message, inbound or outbound, is logged to sms_messages with the
// body PHI-encrypted - symptom texts are health information too.

export type TelecomChannel = "SMS" | "USSD" | "IVR";
export type SmsStatus = "Sent" | "Simulated" | "Failed";
export type SmsSendResult = { status: SmsStatus; providerMessageId?: string; error?: string };

type SendMeta = {
  profileId?: string | null;
  relatedTable?: string;
  relatedId?: string | number;
};

// Twilio's hard cap is 1600 characters; Devanagari/Gujarati SMS is UCS-2
// (70 chars per segment), so callers should keep texts short anyway.
const MAX_SMS_LENGTH = 1500;

function configuredProvider(): "twilio" | "console" {
  return process.env.SMS_PROVIDER?.toLowerCase() === "twilio" ? "twilio" : "console";
}

async function twilioPost(resource: "Messages" | "Calls", params: URLSearchParams): Promise<SmsSendResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) {
    return { status: "Failed", error: "SMS_PROVIDER=twilio but TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN are not set." };
  }

  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/${resource}.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
      signal: AbortSignal.timeout(10_000),
    });
    const json = (await res.json().catch(() => ({}))) as { sid?: string; message?: string };
    if (!res.ok) {
      return { status: "Failed", error: json.message ?? `Twilio returned HTTP ${res.status}` };
    }
    return { status: "Sent", providerMessageId: json.sid };
  } catch (e) {
    return { status: "Failed", error: e instanceof Error ? e.message : "Network error reaching Twilio" };
  }
}

export async function logTelecomMessage(entry: {
  direction: "Inbound" | "Outbound";
  channel: TelecomChannel;
  phone: string;
  body: string;
  status: SmsStatus | "Received";
  profileId?: string | null;
  provider?: string;
  providerMessageId?: string;
  error?: string;
  relatedTable?: string;
  relatedId?: string | number;
}) {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("sms_messages").insert({
      direction: entry.direction,
      channel: entry.channel,
      phone_number: entry.phone.slice(0, 20),
      profile_id: entry.profileId ?? null,
      body: encryptPHI(entry.body) ?? "",
      provider: entry.provider ?? null,
      provider_message_id: entry.providerMessageId ?? null,
      status: entry.status,
      error: entry.error ?? null,
      related_table: entry.relatedTable ?? null,
      related_id: entry.relatedId !== undefined ? String(entry.relatedId) : null,
    });
    if (error) console.error("[telecom] could not log message:", error.message);
  } catch (e) {
    // Logging must never break delivery (e.g. service-role or PHI key missing).
    console.error("[telecom] could not log message:", e instanceof Error ? e.message : e);
  }
}

function simulate(kind: "sms" | "call", to: string, text: string): SmsSendResult {
  // Don't write health information into production logs.
  console.info(
    process.env.NODE_ENV === "production"
      ? `[${kind}:simulated] to ${to} (${text.length} chars) - set SMS_PROVIDER=twilio to deliver for real`
      : `[${kind}:simulated] to ${to}: ${text}`
  );
  return { status: "Simulated" };
}

export async function sendSms(rawTo: string, text: string, meta: SendMeta = {}): Promise<SmsSendResult> {
  const to = toE164(rawTo);
  const body = text.length > MAX_SMS_LENGTH ? `${text.slice(0, MAX_SMS_LENGTH - 1)}…` : text;
  const provider = configuredProvider();

  let result: SmsSendResult;
  if (!to) {
    result = { status: "Failed", error: "Not a valid phone number." };
  } else if (provider === "twilio") {
    const from = process.env.TWILIO_FROM_NUMBER;
    const messagingService = process.env.TWILIO_MESSAGING_SERVICE_SID;
    const params = new URLSearchParams({ To: to, Body: body });
    if (messagingService) params.set("MessagingServiceSid", messagingService);
    else if (from) params.set("From", from);
    result =
      messagingService || from
        ? await twilioPost("Messages", params)
        : { status: "Failed", error: "Set TWILIO_FROM_NUMBER or TWILIO_MESSAGING_SERVICE_SID." };
  } else {
    result = simulate("sms", to, body);
  }

  await logTelecomMessage({
    direction: "Outbound",
    channel: "SMS",
    phone: to ?? rawTo,
    body,
    status: result.status,
    profileId: meta.profileId,
    provider,
    providerMessageId: result.providerMessageId,
    error: result.error,
    relatedTable: meta.relatedTable,
    relatedId: meta.relatedId,
  });

  return result;
}

// Outbound voice call that speaks a message (TwiML <Say>) - reminders for
// patients who can't read an SMS.
export async function placeVoiceCall(
  rawTo: string,
  twiml: string,
  spokenText: string,
  meta: SendMeta = {}
): Promise<SmsSendResult> {
  const to = toE164(rawTo);
  const from = process.env.TWILIO_FROM_NUMBER;
  const provider = configuredProvider();

  let result: SmsSendResult;
  if (!to) {
    result = { status: "Failed", error: "Not a valid phone number." };
  } else if (provider !== "twilio") {
    result = simulate("call", to, spokenText);
  } else if (!from) {
    result = { status: "Failed", error: "Voice calls need a voice-capable TWILIO_FROM_NUMBER." };
  } else {
    result = await twilioPost("Calls", new URLSearchParams({ To: to, From: from, Twiml: twiml }));
  }

  await logTelecomMessage({
    direction: "Outbound",
    channel: "IVR",
    phone: to ?? rawTo,
    body: spokenText,
    status: result.status,
    profileId: meta.profileId,
    provider,
    providerMessageId: result.providerMessageId,
    error: result.error,
    relatedTable: meta.relatedTable,
    relatedId: meta.relatedId,
  });

  return result;
}
