"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isMissingSchemaError } from "@/lib/supabase/schema-fallback";

export type CheckInState = { error?: string };

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

// Token numbers are allocated inside the database by
// allocate_queue_token() (migration 004), under a lock per hospital and
// day. The old app-side "today's max + 1" could never work for more than
// one patient: RLS only lets a patient read their own tickets, so every
// patient computed token 1 and hit the unique constraint.
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

  const { error } = await supabase.rpc("allocate_queue_token", { p_hospital_id: hospitalId });

  if (!error) {
    revalidatePath("/patient/queue");
    return {};
  }

  if (isMissingSchemaError(error)) {
    console.warn(
      "[queue] allocate_queue_token() not found - run supabase/migrations/004_high_priority_fixes.sql. Using the legacy check-in, which only works for the first patient of the day."
    );
    return legacyCheckIn(supabase, user.id, hospitalId);
  }

  return { error: error.message };
}

// Pre-migration-004 behaviour, kept only so check-in doesn't break
// outright before the migration has been run.
async function legacyCheckIn(
  supabase: SupabaseClient,
  profileId: string,
  hospitalId: number
): Promise<CheckInState> {
  const { data: patient } = await supabase
    .from("patients")
    .select("patient_id")
    .eq("profile_id", profileId)
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

    if (!error) {
      revalidatePath("/patient/queue");
      return {};
    }
    if (!error.message.includes("duplicate key")) {
      return { error: error.message };
    }
  }

  return { error: "Queue is busy right now - please try checking in again." };
}
