import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./onboarding-form";

export default async function AshaOnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: existing } = await supabase
    .from("asha_workers")
    .select("asha_id")
    .eq("profile_id", user!.id)
    .maybeSingle();

  if (existing) redirect("/asha/dashboard");

  const { data: villages } = await supabase
    .from("villages")
    .select("village_id, village_name")
    .order("village_name");

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-semibold text-ink">Complete your ASHA profile</h1>
      <p className="mt-1 text-sm text-ink/60">
        One more step - tell us which village you cover.
      </p>
      <div className="mt-8">
        <OnboardingForm villages={villages ?? []} />
      </div>
    </main>
  );
}
