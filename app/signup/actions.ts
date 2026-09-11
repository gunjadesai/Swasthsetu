"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { SelfServeRoleName } from "@/lib/types";

const SELF_SERVE_ROLES = [
  "Patient",
  "ASHAWorker",
  "Doctor",
  "HospitalStaff",
  "LabStaff",
  "PharmacyStaff",
  "AmbulanceProvider",
] as const;

// Roles that need a follow-up onboarding step (pick a village/hospital/
// lab/pharmacy/vehicle) before their dashboard is usable. That step
// needs an authenticated session to read the lookup tables (RLS on
// villages/hospitals/etc. is "authenticated" only, not "anon" - see
// supabase/schema.sql section 16), so it happens as page two, not
// inline in this action.
const ONBOARDING_PATH: Record<string, string> = {
  ASHAWorker: "/asha/onboarding",
  HospitalStaff: "/hospital/onboarding",
  LabStaff: "/lab/onboarding",
  PharmacyStaff: "/pharmacy/onboarding",
  AmbulanceProvider: "/ambulance/onboarding",
};

const DASHBOARD_PATH: Record<string, string> = {
  Patient: "/patient/dashboard",
  Doctor: "/doctor/dashboard",
};

const signupSchema = z.object({
  fullName: z.string().min(2, "Enter your full name"),
  phone: z.string().min(8, "Enter a valid phone number"),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(SELF_SERVE_ROLES),
});

export type SignupState = { error?: string };

export async function signup(
  _prevState: SignupState,
  formData: FormData
): Promise<SignupState> {
  const parsed = signupSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Please check the form and try again.",
    };
  }

  const { fullName, phone, email, password, role } = parsed.data;
  const supabase = await createClient();

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (signUpError) {
    return { error: signUpError.message };
  }

  const user = signUpData.user;
  if (!user) {
    return {
      error:
        'Account created, but no session came back - "Confirm email" is probably still on in Supabase (Authentication -> Providers -> Email). Turn it off for this prototype, or check your inbox and confirm before signing in.',
    };
  }

  const { data: roleRow, error: roleError } = await supabase
    .from("roles")
    .select("role_id")
    .eq("role_name", role)
    .single();

  if (roleError || !roleRow) {
    return {
      error: "Could not find that role - has supabase/schema.sql been run on this project yet?",
    };
  }

  const { error: profileError } = await supabase.from("profiles").insert({
    id: user.id,
    full_name: fullName,
    phone_number: phone,
    role_id: roleRow.role_id,
  });

  if (profileError) {
    return { error: profileError.message };
  }

  if (role === "Patient") {
    const { error: patientError } = await supabase
      .from("patients")
      .insert({ profile_id: user.id });
    if (patientError) return { error: patientError.message };
  } else if (role === "Doctor") {
    const { error: doctorError } = await supabase
      .from("doctors")
      .insert({ profile_id: user.id });
    if (doctorError) return { error: doctorError.message };
  }

  const next: SelfServeRoleName = role;
  redirect(ONBOARDING_PATH[next] ?? DASHBOARD_PATH[next] ?? "/");
}
