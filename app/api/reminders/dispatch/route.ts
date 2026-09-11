import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// System job, no end-user session - hence the service-role client (see
// lib/supabase/admin.ts). Call this from a cron trigger (Vercel Cron,
// Supabase scheduled function, or just manually while testing).
//
// 'App' reminders are genuinely delivered - the notification bell
// reads reminders where status = 'Sent', so marking them Sent here IS
// the delivery. 'SMS'/'IVR' reminders are marked Failed with an
// explicit reason: this prototype has no Twilio/MSG91 (or similar)
// credentials, the same category of gap as the already-flagged
// missing CLOUDINARY_CLOUD_NAME in progress.md - wiring a real
// provider in is future work, not a silent no-op.
export async function POST() {
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data: due, error } = await admin
    .from("reminders")
    .select("reminder_id, channel")
    .eq("status", "Pending")
    .lte("scheduled_for", nowIso);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const appIds = (due ?? []).filter((r) => r.channel === "App").map((r) => r.reminder_id);
  const telecomIds = (due ?? []).filter((r) => r.channel !== "App").map((r) => r.reminder_id);

  if (appIds.length > 0) {
    await admin.from("reminders").update({ status: "Sent" }).in("reminder_id", appIds);
  }
  if (telecomIds.length > 0) {
    await admin.from("reminders").update({ status: "Failed" }).in("reminder_id", telecomIds);
  }

  return NextResponse.json({
    dispatchedInApp: appIds.length,
    failedNoProvider: telecomIds.length,
    note:
      telecomIds.length > 0
        ? "SMS/IVR reminders need a telecom provider key (e.g. Twilio, MSG91) that isn't configured yet."
        : undefined,
  });
}
