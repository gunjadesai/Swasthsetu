import { redirect } from "next/navigation";
import { Siren } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { DashboardNav, type NavItem } from "@/components/nav/dashboard-nav";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { VerificationBanner } from "@/components/verification-banner";

export default async function AmbulanceLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: ambulance } = await supabase
    .from("ambulances")
    .select("ambulance_id")
    .eq("driver_profile_id", user!.id)
    .maybeSingle();
  if (!ambulance) redirect("/ambulance/onboarding");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user!.id)
    .single();
  const t = await getDictionary();

  const items: NavItem[] = [
    { href: "/ambulance/dashboard", label: t("nav.ambulanceRequests"), icon: <Siren className="h-4 w-4" /> },
  ];

  return (
    <div className="flex">
      <DashboardNav items={items} roleLabel="Ambulance Provider" fullName={profile?.full_name ?? "Ambulance Provider"} />
      <main className="min-h-screen flex-1 bg-sage-50 px-8 py-8">
        <VerificationBanner />
        {children}
      </main>
    </div>
  );
}
