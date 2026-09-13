import { redirect } from "next/navigation";
import { Home, BookHeart, MessageSquareText, HeartPulse, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { DashboardNav, type NavItem } from "@/components/nav/dashboard-nav";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, roles(role_name)")
    .eq("id", user!.id)
    .single();

  const roleName = (profile?.roles as unknown as { role_name?: string } | null)?.role_name;
  if (roleName !== "Administrator") redirect("/");

  const t = await getDictionary();

  const items: NavItem[] = [
    { href: "/admin/dashboard", label: t("nav.dashboard"), icon: <Home className="h-4 w-4" /> },
    { href: "/admin/verifications", label: t("nav.verifications"), icon: <ShieldCheck className="h-4 w-4" /> },
    { href: "/admin/health-index", label: t("nav.healthIndex"), icon: <HeartPulse className="h-4 w-4" /> },
    { href: "/admin/schemes", label: t("nav.schemes"), icon: <BookHeart className="h-4 w-4" /> },
    { href: "/admin/feedback", label: t("nav.feedback"), icon: <MessageSquareText className="h-4 w-4" /> },
  ];

  return (
    <div className="flex">
      <DashboardNav items={items} roleLabel="Administrator" fullName={profile?.full_name ?? "Administrator"} />
      <main className="min-h-screen flex-1 bg-sage-50 px-8 py-8">{children}</main>
    </div>
  );
}
