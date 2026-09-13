import { redirect } from "next/navigation";
import { Home, Ticket, Share2, MessageSquareText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { DashboardNav, type NavItem } from "@/components/nav/dashboard-nav";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { VerificationBanner } from "@/components/verification-banner";

export default async function HospitalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: staff } = await supabase
    .from("hospital_staff")
    .select("staff_id")
    .eq("profile_id", user!.id)
    .maybeSingle();

  if (!staff) redirect("/hospital/onboarding");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user!.id)
    .single();
  const t = await getDictionary();

  const items: NavItem[] = [
    { href: "/hospital/dashboard", label: t("nav.dashboard"), icon: <Home className="h-4 w-4" /> },
    { href: "/hospital/queue", label: t("nav.queue"), icon: <Ticket className="h-4 w-4" /> },
    { href: "/hospital/referrals", label: t("nav.referrals"), icon: <Share2 className="h-4 w-4" /> },
    { href: "/hospital/feedback", label: t("nav.feedback"), icon: <MessageSquareText className="h-4 w-4" /> },
  ];

  return (
    <div className="flex">
      <DashboardNav items={items} roleLabel="Hospital Staff" fullName={profile?.full_name ?? "Hospital Staff"} />
      <main className="min-h-screen flex-1 bg-sage-50 px-8 py-8">
        <VerificationBanner />
        {children}
      </main>
    </div>
  );
}
