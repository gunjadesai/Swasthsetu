import { redirect } from "next/navigation";
import { Pill } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { DashboardNav, type NavItem } from "@/components/nav/dashboard-nav";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export default async function PharmacyLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: staff } = await supabase
    .from("pharmacy_staff")
    .select("staff_id")
    .eq("profile_id", user!.id)
    .maybeSingle();
  if (!staff) redirect("/pharmacy/onboarding");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user!.id)
    .single();
  const t = await getDictionary();

  const items: NavItem[] = [
    { href: "/pharmacy/dashboard", label: t("nav.pharmacyStock"), icon: <Pill className="h-4 w-4" /> },
  ];

  return (
    <div className="flex">
      <DashboardNav items={items} roleLabel="Pharmacy Staff" fullName={profile?.full_name ?? "Pharmacy Staff"} />
      <main className="min-h-screen flex-1 bg-sage-50 px-8 py-8">{children}</main>
    </div>
  );
}
