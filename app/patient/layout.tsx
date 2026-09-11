import { Home, Calendar, User, Stethoscope, Ticket, Siren, BookHeart, MessageSquareText, Pill } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { DashboardNav, type NavItem } from "@/components/nav/dashboard-nav";
import { NotificationBell } from "@/components/notification-bell";
import { getDictionary } from "@/lib/i18n/get-dictionary";

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
  const t = await getDictionary();

  const { data: patient } = await supabase
    .from("patients")
    .select("patient_id")
    .eq("profile_id", user!.id)
    .maybeSingle();

  const { data: reminders } = patient
    ? await supabase
        .from("reminders")
        .select("reminder_id, message, scheduled_for")
        .eq("patient_id", patient.patient_id)
        .eq("status", "Sent")
        .order("scheduled_for", { ascending: false })
        .limit(10)
    : { data: [] };

  const items: NavItem[] = [
    { href: "/patient/dashboard", label: t("nav.dashboard"), icon: <Home className="h-4 w-4" /> },
    { href: "/patient/appointments", label: t("nav.appointments"), icon: <Calendar className="h-4 w-4" /> },
    { href: "/patient/triage", label: t("nav.triage"), icon: <Stethoscope className="h-4 w-4" /> },
    { href: "/patient/queue", label: t("nav.queue"), icon: <Ticket className="h-4 w-4" /> },
    { href: "/patient/emergency", label: t("nav.emergency"), icon: <Siren className="h-4 w-4" /> },
    { href: "/patient/schemes", label: t("nav.schemes"), icon: <BookHeart className="h-4 w-4" /> },
    { href: "/patient/medicine-search", label: t("nav.medicineSearch"), icon: <Pill className="h-4 w-4" /> },
    { href: "/patient/feedback", label: t("nav.feedback"), icon: <MessageSquareText className="h-4 w-4" /> },
    { href: "/patient/profile", label: t("nav.profile"), icon: <User className="h-4 w-4" /> },
  ];

  return (
    <div className="flex">
      <DashboardNav
        items={items}
        roleLabel="Patient"
        fullName={profile?.full_name ?? "Patient"}
        headerExtra={<NotificationBell reminders={reminders ?? []} />}
      />
      <main className="min-h-screen flex-1 bg-sage-50 px-8 py-8">
        {children}
      </main>
    </div>
  );
}
