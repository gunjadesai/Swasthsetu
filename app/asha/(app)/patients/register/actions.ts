"use server";

import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type RegisterPatientState = { error?: string; success?: boolean };

// ASHA-assisted registration for a patient who has no email/device of
// their own (the common case in the field). Supabase Auth still needs
// a unique identifier per user, so a placeholder email is synthesized
// from the phone number and a random password is generated - the
// patient signs in later via a "forgot password" reset once they have
// a device, or stays ASHA-mediated indefinitely. Documented prototype
// simplification, same spirit as the existing "Confirm email off" one
// in progress.md.
export async function registerAssistedPatient(
  _prevState: RegisterPatientState,
  formData: FormData
): Promise<RegisterPatientState> {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const dateOfBirth = String(formData.get("dateOfBirth") ?? "").trim();
  const gender = String(formData.get("gender") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const emergencyContact = String(formData.get("emergencyContact") ?? "").trim();

  if (!fullName || !phone) {
    return { error: "Full name and phone number are required." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: asha } = await supabase
    .from("asha_workers")
    .select("asha_id")
    .eq("profile_id", user.id)
    .single();
  if (!asha) {
    return { error: "Your ASHA profile isn't set up yet - finish onboarding first." };
  }

  const { data: roleRow } = await supabase
    .from("roles")
    .select("role_id")
    .eq("role_name", "Patient")
    .single();
  if (!roleRow) return { error: "Could not find the Patient role." };

  const admin = createAdminClient();
  const placeholderEmail = `${phone.replace(/\D/g, "")}@asha.rural-health.local`;
  const randomPassword = randomUUID();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: placeholderEmail,
    password: randomPassword,
    email_confirm: true,
    user_metadata: { created_by_asha: true },
  });

  if (createError || !created.user) {
    return {
      error:
        createError?.message ??
        "Could not create the patient's account - they may already be registered.",
    };
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: created.user.id,
    full_name: fullName,
    phone_number: phone,
    role_id: roleRow.role_id,
  });
  if (profileError) return { error: profileError.message };

  const { error: patientError } = await admin.from("patients").insert({
    profile_id: created.user.id,
    date_of_birth: dateOfBirth || null,
    gender: gender || null,
    address: address || null,
    emergency_contact: emergencyContact || null,
    registered_by_asha_id: asha.asha_id,
  });
  if (patientError) return { error: patientError.message };

  return { success: true };
}
