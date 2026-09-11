"use server";

import { createClient } from "@/lib/supabase/server";

export type CheckInState = { error?: string };

// Token numbers are assigned as (today's max for this hospital) + 1.
// Two people checking in at the same instant can race for the same
// number - the UNIQUE (hospital_id, queue_date, token_number)
// constraint in the migration catches that, and we retry a few times
// rather than trusting a client-computed number (same reasoning as the
// existing appointment-slot booking flow).
export async function checkInToQueue(
  _prevState: CheckInState,
  formData: FormData
): Promise<CheckInState> {
  const hospitalId = Number(formData.get("hospitalId"));
  if (!hospitalId) return { error: "Pick a hospital to check in at." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: patient } = await supabase
    .from("patients")
    .select("patient_id")
    .eq("profile_id", user.id)
    .single();
  if (!patient) return { error: "Patient profile not found." };

  const today = new Date().toISOString().slice(0, 10);

  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: existing } = await supabase
      .from("queue_tickets")
      .select("token_number")
      .eq("hospital_id", hospitalId)
      .eq("queue_date", today)
      .order("token_number", { ascending: false })
      .limit(1);

    const nextToken = (existing?.[0]?.token_number ?? 0) + 1;

    const { error } = await supabase.from("queue_tickets").insert({
      hospital_id: hospitalId,
      patient_id: patient.patient_id,
      queue_date: today,
      token_number: nextToken,
    });

    if (!error) return {};
    if (!error.message.includes("duplicate key")) {
      return { error: error.message };
    }
    // duplicate token_number race - loop and retry with a fresh max
  }

  return { error: "Queue is busy right now - please try checking in again." };
}
