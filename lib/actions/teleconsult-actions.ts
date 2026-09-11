"use server";

import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";

// Real teleconsultation via an embedded Jitsi Meet room (meet.jit.si) -
// no vendor signup, no API key. The room name is derived from the
// appointment id plus a random suffix so it can't be guessed/joined by
// someone who isn't on this platform. One row per appointment in
// teleconsult_sessions carries the link and the join/leave timestamps.
export async function getOrCreateTeleconsultRoom(appointmentId: number): Promise<{
  meetingLink: string;
  error?: string;
}> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("teleconsult_sessions")
    .select("session_id, meeting_link")
    .eq("appointment_id", appointmentId)
    .maybeSingle();

  if (existing?.meeting_link) {
    return { meetingLink: existing.meeting_link };
  }

  const meetingLink = `https://meet.jit.si/rural-health-${appointmentId}-${randomUUID().slice(0, 8)}`;

  const { error } = await supabase.from("teleconsult_sessions").insert({
    appointment_id: appointmentId,
    meeting_link: meetingLink,
  });

  if (error) return { meetingLink: "", error: error.message };
  return { meetingLink };
}

export async function markTeleconsultJoined(appointmentId: number) {
  const supabase = await createClient();
  await supabase
    .from("teleconsult_sessions")
    .update({ started_at: new Date().toISOString() })
    .eq("appointment_id", appointmentId)
    .is("started_at", null);
}

export async function markTeleconsultEnded(appointmentId: number) {
  const supabase = await createClient();
  await supabase
    .from("teleconsult_sessions")
    .update({ ended_at: new Date().toISOString() })
    .eq("appointment_id", appointmentId);
}
