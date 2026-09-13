"use server";

import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptPHI } from "@/lib/phi-crypto";

export type RegisterPatientState = { error?: string; success?: boolean };

// ASHA-assisted registration for a patient who has no email/device of
// their own (the common case in the field). Supabase Auth still needs
// a unique identifier per user, so a placeholder email is synthesized
// from the phone number and a random password is generated - the
// patient signs in later via a "forgot password" reset once they have
// a device, or stays ASHA-mediated indefinitely (and can use the SMS,
// USSD and IVR lines from a keypad phone, matched by this phone number).
// Documented prototype simplification, same spirit as the existing
// "Confirm email off" one in progress.md.
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

  // Encrypt before creating anything, so a missing key can't leave a
  // half-registered account behind.
  let encryptedAddress: string | null;
  let encryptedEmergencyContact: string | null;
  try {
    encryptedAddress = encryptPHI(address);
    encryptedEmergencyContact = encryptPHI(emergencyContact);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not secure the patient's details." };
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

  // Registration runs with the service-role key below, which RLS can't
  // gate - so the verification check has to happen here (migration 004).
  const { data: me, error: meError } = await supabase
    .from("profiles")
    .select("verification_status")
    .eq("id", user.id)
    .single();
  if (!meError && me && me.verification_status !== "Verified") {
    return {
      error:
        "Your ASHA account is waiting for administrator verification - you can register patients once it's approved.",
    };
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
    address: encryptedAddress,
    emergency_contact: encryptedEmergencyContact,
    registered_by_asha_id: asha.asha_id,
  });
  if (patientError) return { error: patientError.message };

  return { success: true };
}
