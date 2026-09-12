"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { encryptPHI } from "@/lib/phi-crypto";

const schema = z.object({
  fullName: z.string().min(2, "Enter your full name"),
  phone: z.string().min(8, "Enter a valid phone number"),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  bloodGroup: z.string().optional(),
  address: z.string().optional(),
  emergencyContact: z.string().optional(),
});

export type ProfileState = { error?: string; success?: boolean };

export async function updatePatientProfile(
  _prevState: ProfileState,
  formData: FormData
): Promise<ProfileState> {
  const parsed = schema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    dateOfBirth: formData.get("dateOfBirth") || undefined,
    gender: formData.get("gender") || undefined,
    bloodGroup: formData.get("bloodGroup") || undefined,
    address: formData.get("address") || undefined,
    emergencyContact: formData.get("emergencyContact") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const {
    fullName,
    phone,
    dateOfBirth,
    gender,
    bloodGroup,
    address,
    emergencyContact,
  } = parsed.data;

  // Address and emergency contact are PHI - stored encrypted.
  let encryptedAddress: string | null;
  let encryptedEmergencyContact: string | null;
  try {
    encryptedAddress = encryptPHI(address);
    encryptedEmergencyContact = encryptPHI(emergencyContact);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not secure your details." };
  }

  const [{ error: profileError }, { error: patientError }] = await Promise.all([
    supabase
      .from("profiles")
      .update({ full_name: fullName, phone_number: phone })
      .eq("id", user.id),
    supabase
      .from("patients")
      .update({
        date_of_birth: dateOfBirth ?? null,
        gender: gender ?? null,
        blood_group: bloodGroup ?? null,
        address: encryptedAddress,
        emergency_contact: encryptedEmergencyContact,
      })
      .eq("profile_id", user.id),
  ]);

  if (profileError) return { error: profileError.message };
  if (patientError) return { error: patientError.message };

  revalidatePath("/patient/profile");
  revalidatePath("/patient/dashboard");
  return { success: true };
}
