import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./onboarding-form";

export default async function AmbulanceOnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: existing } = await supabase
    .from("ambulances")
    .select("ambulance_id")
    .eq("driver_profile_id", user!.id)
    .maybeSingle();
  if (existing) redirect("/ambulance/dashboard");

  const { data: districts } = await supabase
    .from("districts")
    .select("district_id, district_name")
    .order("district_name");

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-semibold text-ink">Register your ambulance</h1>
      <p className="mt-1 text-sm text-ink/60">Tell us your vehicle and district.</p>
      <div className="mt-8">
        <OnboardingForm districts={districts ?? []} />
      </div>
    </main>
  );
}
