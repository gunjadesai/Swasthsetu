"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type OnboardState = { error?: string };

export async function completeAmbulanceOnboarding(
  _prevState: OnboardState,
  formData: FormData
): Promise<OnboardState> {
  const vehicleNumber = String(formData.get("vehicleNumber") ?? "").trim();
  const districtId = Number(formData.get("districtId"));

  if (!vehicleNumber || !districtId) {
    return { error: "Enter your vehicle number and pick a district." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase.from("ambulances").insert({
    vehicle_number: vehicleNumber,
    driver_profile_id: user.id,
    district_id: districtId,
  });
  if (error) return { error: error.message };

  redirect("/ambulance/dashboard");
}
