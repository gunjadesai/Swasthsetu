"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type OnboardState = { error?: string };

export async function completeLabStaffOnboarding(
  _prevState: OnboardState,
  formData: FormData
): Promise<OnboardState> {
  const labId = Number(formData.get("labId"));
  if (!labId) return { error: "Pick your laboratory." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase.from("lab_staff").insert({ profile_id: user.id, lab_id: labId });
  if (error) return { error: error.message };

  redirect("/lab/dashboard");
}
