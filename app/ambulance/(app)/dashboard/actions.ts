"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isMissingSchemaError } from "@/lib/supabase/schema-fallback";

export type DispatchResult = { error?: string };

async function resolveAmbulanceId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("ambulances")
    .select("ambulance_id")
    .eq("driver_profile_id", user.id)
    .single();
  return data?.ambulance_id ?? null;
}

// Accepting is done by claim_ambulance_request() (migration 005), not by
// an UPDATE from here: two drivers tapping "Accept" on the same request
// used to race, and the second write silently stole the dispatch from
// the first. The function claims the row in a single statement and tells
// the loser their request was already taken.
export async function acceptRequest(requestId: number): Promise<DispatchResult> {
  const supabase = await createClient();

  const { error } = await supabase.rpc("claim_ambulance_request", { p_request_id: requestId });

  if (error) {
    if (isMissingSchemaError(error)) {
      return {
        error:
          "Ambulance dispatch isn't set up in the database yet - run supabase/migrations/005_open_issue_fixes.sql. Call 108 for this patient now.",
      };
    }
    // 55000 = raised by the function when someone else got there first.
    if (error.code === "55000") {
      return { error: "Another ambulance has already taken this request." };
    }
    if (error.code === "42501") {
      return { error: "Your ambulance account is still waiting for an administrator's approval." };
    }
    return { error: error.message };
  }

  revalidatePath("/ambulance/dashboard");
  return {};
}

export async function completeRequest(requestId: number): Promise<DispatchResult> {
  const supabase = await createClient();
  const ambulanceId = await resolveAmbulanceId(supabase);
  if (!ambulanceId) return { error: "Ambulance profile not found." };

  const { error } = await supabase
    .from("ambulance_requests")
    .update({ status: "Completed", completed_at: new Date().toISOString() })
    .eq("request_id", requestId)
    .eq("ambulance_id", ambulanceId);
  if (error) return { error: error.message };

  await supabase.from("ambulances").update({ is_available: true }).eq("ambulance_id", ambulanceId);
  revalidatePath("/ambulance/dashboard");
  return {};
}

export async function toggleAvailability(
  ambulanceId: number,
  isAvailable: boolean
): Promise<DispatchResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("ambulances")
    .update({ is_available: isAvailable })
    .eq("ambulance_id", ambulanceId);
  if (error) return { error: error.message };
  revalidatePath("/ambulance/dashboard");
  return {};
}
