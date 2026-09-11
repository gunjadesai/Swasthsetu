"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SchemeState = { error?: string };

export async function createScheme(
  _prevState: SchemeState,
  formData: FormData
): Promise<SchemeState> {
  const supabase = await createClient();

  const { error } = await supabase.from("health_schemes").insert({
    scheme_name: String(formData.get("scheme_name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || null,
    eligibility_criteria: String(formData.get("eligibility_criteria") ?? "").trim() || null,
    scheme_name_hi: String(formData.get("scheme_name_hi") ?? "").trim() || null,
    description_hi: String(formData.get("description_hi") ?? "").trim() || null,
    eligibility_criteria_hi: String(formData.get("eligibility_criteria_hi") ?? "").trim() || null,
  });

  if (error) return { error: error.message };

  revalidatePath("/admin/schemes");
  revalidatePath("/patient/schemes");
  return {};
}

export async function toggleSchemeActive(schemeId: number, isActive: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("health_schemes")
    .update({ is_active: isActive })
    .eq("scheme_id", schemeId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/schemes");
  revalidatePath("/patient/schemes");
}
