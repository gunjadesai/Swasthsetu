import { redirect } from "next/navigation";
import { Home, UserPlus, ClipboardList, MapPin, Stethoscope, Siren } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { DashboardNav, type NavItem } from "@/components/nav/dashboard-nav";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { VerificationBanner } from "@/components/verification-banner";

export default async function AshaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: asha } = await supabase
    .from("asha_workers")
    .select("asha_id")
    .eq("profile_id", user!.id)
    .maybeSingle();

  if (!asha) redirect("/asha/onboarding");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user!.id)
    .single();
  const t = await getDictionary();

  const items: NavItem[] = [
    { href: "/asha/dashboard", label: t("nav.dashboard"), icon: <Home className="h-4 w-4" /> },
    { href: "/asha/patients/register", label: t("nav.registerPatient"), icon: <UserPlus className="h-4 w-4" /> },
    { href: "/asha/triage", label: t("nav.triage"), icon: <Stethoscope className="h-4 w-4" /> },
    { href: "/asha/emergency", label: t("nav.emergency"), icon: <Siren className="h-4 w-4" /> },
    { href: "/asha/visits", label: t("nav.visits"), icon: <ClipboardList className="h-4 w-4" /> },
    { href: "/asha/directory", label: t("nav.directory"), icon: <MapPin className="h-4 w-4" /> },
  ];

  return (
    <div className="flex">
      <DashboardNav items={items} roleLabel="ASHA Worker" fullName={profile?.full_name ?? "ASHA Worker"} />
      <main className="min-h-screen flex-1 bg-sage-50 px-8 py-8">
        <VerificationBanner />
        {children}
      </main>
    </div>
  );
}
