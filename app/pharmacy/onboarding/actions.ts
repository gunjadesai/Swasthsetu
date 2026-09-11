"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type OnboardState = { error?: string };

export async function completePharmacyStaffOnboarding(
  _prevState: OnboardState,
  formData: FormData
): Promise<OnboardState> {
  const pharmacyId = Number(formData.get("pharmacyId"));
  if (!pharmacyId) return { error: "Pick your pharmacy." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("pharmacy_staff")
    .insert({ profile_id: user.id, pharmacy_id: pharmacyId });
  if (error) return { error: error.message };

  redirect("/pharmacy/dashboard");
}
