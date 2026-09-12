import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { defaultLocale, locales, type Locale } from "@/lib/i18n/dictionaries";
import { placeVoiceCall, sendSms, type SmsSendResult } from "@/lib/telecom/sms";
import { say, twimlDocument } from "@/lib/telecom/twiml";
import { verifyCronRequest } from "@/lib/cron-auth";

// System job, no end-user session - hence the service-role client (see
// lib/supabase/admin.ts). Call this from a cron trigger (Vercel Cron,
// Supabase scheduled function, or with curl while testing). CRON_SECRET
// is required: the caller sends `Authorization: Bearer <secret>` (or
// x-cron-secret), and with no secret configured the route answers 503
// rather than leaving a service-role endpoint open to anyone who finds
// the path - see lib/cron-auth.ts.
//
// 'App' reminders are delivered by marking them Sent - the notification
// bell reads reminders where status = 'Sent'.
// 'SMS' reminders go out through lib/telecom/sms.ts; 'IVR' reminders place
// a voice call that reads the message aloud in the patient's language,
// for people who can't read a text. Without SMS_PROVIDER=twilio both are
// only simulated, and the row is marked Failed with that reason - never
// silently Sent.
export async function POST(request: Request) {
  const auth = verifyCronRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data: due, error } = await admin
    .from("reminders")
    .select("reminder_id, channel, message, patients(profiles(id, phone_number, languages(language_code)))")
    .eq("status", "Pending")
    .lte("scheduled_for", nowIso)
    .order("scheduled_for", { ascending: true })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = due ?? [];
  const appIds = rows.filter((r) => r.channel === "App").map((r) => r.reminder_id);
  if (appIds.length > 0) {
    await admin.from("reminders").update({ status: "Sent" }).in("reminder_id", appIds);
  }

  const summary = {
    dispatchedInApp: appIds.length,
    sms: { sent: 0, simulated: 0, failed: 0 },
    ivr: { sent: 0, simulated: 0, failed: 0 },
  };

  for (const reminder of rows.filter((r) => r.channel !== "App")) {
    const profile =
      (
        reminder.patients as unknown as {
          profiles: { id: string; phone_number: string | null; languages: { language_code: string } | null } | null;
        } | null
      )?.profiles ?? null;
    const code = profile?.languages?.language_code as Locale | undefined;
    const locale = code && locales.includes(code) ? code : defaultLocale;
    const meta = { profileId: profile?.id, relatedTable: "reminders", relatedId: reminder.reminder_id };

    let result: SmsSendResult;
    if (!profile?.phone_number) {
      result = { status: "Failed", error: "Patient has no phone number on file." };
    } else if (reminder.channel === "SMS") {
      result = await sendSms(profile.phone_number, reminder.message, meta);
    } else {
      // Said twice: people often miss the start while lifting the phone.
      const twiml = twimlDocument(say(reminder.message, locale), '<Pause length="1"/>', say(reminder.message, locale));
      result = await placeVoiceCall(profile.phone_number, twiml, reminder.message, meta);
    }

    const bucket = reminder.channel === "SMS" ? summary.sms : summary.ivr;
    if (result.status === "Sent") bucket.sent++;
    else if (result.status === "Simulated") bucket.simulated++;
    else bucket.failed++;

    await admin
      .from("reminders")
      .update({
        status: result.status === "Sent" ? "Sent" : "Failed",
        last_error:
          result.status === "Sent"
            ? null
            : result.status === "Simulated"
              ? "Simulated only - set SMS_PROVIDER=twilio to deliver for real."
              : (result.error ?? "Delivery failed."),
        provider_message_id: result.providerMessageId ?? null,
      })
      .eq("reminder_id", reminder.reminder_id);
  }

  return NextResponse.json(summary);
}
