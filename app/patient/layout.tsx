import { Home, Calendar, User } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { DashboardNav, type NavItem } from "@/components/nav/dashboard-nav";

const items: NavItem[] = [
  {
    href: "/patient/dashboard",
    label: "Overview",
    icon: <Home className="h-4 w-4" />,
  },
  {
    href: "/patient/appointments",
    label: "Appointments",
    icon: <Calendar className="h-4 w-4" />,
  },
  {
    href: "/patient/profile",
    label: "My profile",
    icon: <User className="h-4 w-4" />,
  },
];

export default async function PatientLayout({
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

  return (
    <div className="flex">
      <DashboardNav
        items={items}
        roleLabel="Patient"
        fullName={profile?.full_name ?? "Patient"}
      />
      <main className="min-h-screen flex-1 bg-sage-50 px-8 py-8">
        {children}
      </main>
    </div>
  );
}
