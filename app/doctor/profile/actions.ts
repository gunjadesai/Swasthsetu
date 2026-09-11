"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  fullName: z.string().min(2, "Enter your full name"),
  phone: z.string().min(8, "Enter a valid phone number"),
  specialization: z.string().optional(),
  registrationNumber: z.string().optional(),
  supportsTeleconsult: z.string().optional(),
});

export type ProfileState = { error?: string; success?: boolean };

export async function updateDoctorProfile(
  _prevState: ProfileState,
  formData: FormData
): Promise<ProfileState> {
  const parsed = schema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    specialization: formData.get("specialization") || undefined,
    registrationNumber: formData.get("registrationNumber") || undefined,
    supportsTeleconsult: formData.get("supportsTeleconsult") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const [{ error: profileError }, { error: doctorError }] = await Promise.all([
    supabase
      .from("profiles")
      .update({
        full_name: parsed.data.fullName,
        phone_number: parsed.data.phone,
      })
      .eq("id", user.id),
    supabase
      .from("doctors")
      .update({
        specialization: parsed.data.specialization ?? null,
        registration_number: parsed.data.registrationNumber ?? null,
        supports_teleconsult: parsed.data.supportsTeleconsult === "on",
      })
      .eq("profile_id", user.id),
  ]);

  if (profileError) return { error: profileError.message };
  if (doctorError) return { error: doctorError.message };

  revalidatePath("/doctor/profile");
  revalidatePath("/doctor/dashboard");
  return { success: true };
}
