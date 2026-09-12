import { Home, CalendarClock, Clock, User } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { DashboardNav, type NavItem } from "@/components/nav/dashboard-nav";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export default async function DoctorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user!.id)
    .single();

  const t = await getDictionary();

  const items: NavItem[] = [
    {
      href: "/doctor/dashboard",
      label: t("nav.dashboard"),
      icon: <Home className="h-4 w-4" />,
    },
    {
      href: "/doctor/appointments",
      label: t("nav.appointments"),
      icon: <CalendarClock className="h-4 w-4" />,
    },
    {
      href: "/doctor/availability",
      label: t("nav.availability"),
      icon: <Clock className="h-4 w-4" />,
    },
    {
      href: "/doctor/profile",
      label: t("nav.profile"),
      icon: <User className="h-4 w-4" />,
    },
  ];



  return (
    <div className="flex">
      <DashboardNav
        items={items}
        roleLabel="Doctor"
        fullName={
          profile?.full_name ? `Dr. ${profile.full_name}` : "Doctor"
        }
      />
      <main className="min-h-screen flex-1 bg-sage-50 px-8 py-8">
        {children}
      </main>
    </div>
  );
}
