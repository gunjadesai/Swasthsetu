"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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

export async function acceptRequest(requestId: number) {
  const supabase = await createClient();
  const ambulanceId = await resolveAmbulanceId(supabase);
  if (!ambulanceId) throw new Error("Ambulance profile not found.");

  const { error } = await supabase
    .from("ambulance_requests")
    .update({ ambulance_id: ambulanceId, status: "Dispatched", dispatched_at: new Date().toISOString() })
    .eq("request_id", requestId)
    .is("ambulance_id", null);
  if (error) throw new Error(error.message);

  await supabase.from("ambulances").update({ is_available: false }).eq("ambulance_id", ambulanceId);
  revalidatePath("/ambulance/dashboard");
}

export async function completeRequest(requestId: number) {
  const supabase = await createClient();
  const ambulanceId = await resolveAmbulanceId(supabase);
  if (!ambulanceId) throw new Error("Ambulance profile not found.");

  const { error } = await supabase
    .from("ambulance_requests")
    .update({ status: "Completed", completed_at: new Date().toISOString() })
    .eq("request_id", requestId);
  if (error) throw new Error(error.message);

  await supabase.from("ambulances").update({ is_available: true }).eq("ambulance_id", ambulanceId);
  revalidatePath("/ambulance/dashboard");
}

export async function toggleAvailability(ambulanceId: number, isAvailable: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("ambulances")
    .update({ is_available: isAvailable })
    .eq("ambulance_id", ambulanceId);
  if (error) throw new Error(error.message);
  revalidatePath("/ambulance/dashboard");
}
