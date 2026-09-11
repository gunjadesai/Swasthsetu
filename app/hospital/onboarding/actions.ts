"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type OnboardState = { error?: string };

export async function completeHospitalStaffOnboarding(
  _prevState: OnboardState,
  formData: FormData
): Promise<OnboardState> {
  const hospitalId = Number(formData.get("hospitalId"));
  const designation = String(formData.get("designation") ?? "").trim();

  if (!hospitalId) return { error: "Pick your hospital." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase.from("hospital_staff").insert({
    profile_id: user.id,
    hospital_id: hospitalId,
    designation: designation || null,
  });

  if (error) return { error: error.message };

  redirect("/hospital/dashboard");
}
