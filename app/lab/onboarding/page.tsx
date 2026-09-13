import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./onboarding-form";

export default async function LabOnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: existing } = await supabase
    .from("lab_staff")
    .select("staff_id")
    .eq("profile_id", user!.id)
    .maybeSingle();
  if (existing) redirect("/lab/dashboard");

  const { data: labs } = await supabase.from("laboratories").select("lab_id, name").order("name");

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-semibold text-ink">Complete your lab profile</h1>
      <p className="mt-1 text-sm text-ink/70">Tell us which laboratory you work at.</p>
      <div className="mt-8">
        <OnboardingForm labs={labs ?? []} />
      </div>
    </main>
  );
}
