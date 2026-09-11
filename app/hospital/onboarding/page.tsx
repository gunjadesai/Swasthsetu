import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./onboarding-form";

export default async function HospitalOnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: existing } = await supabase
    .from("hospital_staff")
    .select("staff_id")
    .eq("profile_id", user!.id)
    .maybeSingle();

  if (existing) redirect("/hospital/dashboard");

  const { data: hospitals } = await supabase
    .from("hospitals")
    .select("hospital_id, name")
    .order("name");

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-semibold text-ink">Complete your hospital staff profile</h1>
      <p className="mt-1 text-sm text-ink/60">Tell us which facility you work at.</p>
      <div className="mt-8">
        <OnboardingForm hospitals={hospitals ?? []} />
      </div>
    </main>
  );
}
