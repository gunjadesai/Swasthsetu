"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type OnboardState = { error?: string };

export async function completeAshaOnboarding(
  _prevState: OnboardState,
  formData: FormData
): Promise<OnboardState> {
  const villageId = Number(formData.get("villageId"));
  const ashaCode = String(formData.get("ashaCode") ?? "").trim();

  if (!villageId) return { error: "Pick your assigned village." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase.from("asha_workers").insert({
    profile_id: user.id,
    assigned_village_id: villageId,
    asha_code: ashaCode || null,
  });

  if (error) return { error: error.message };

  redirect("/asha/dashboard");
}
