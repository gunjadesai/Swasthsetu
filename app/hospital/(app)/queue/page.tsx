import { createClient } from "@/lib/supabase/server";
import { QueueBoard } from "./queue-board";

const PRIORITY_ORDER: Record<string, number> = { Emergency: 0, Priority: 1, Normal: 2 };

export default async function HospitalQueuePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: staff } = await supabase
    .from("hospital_staff")
    .select("hospital_id")
    .eq("profile_id", user!.id)
    .single();

  const today = new Date().toISOString().slice(0, 10);

  const { data: tickets } = await supabase
    .from("queue_tickets")
    .select("ticket_id, token_number, priority, status, checked_in_at, patients(profiles(full_name))")
    .eq("hospital_id", staff?.hospital_id ?? -1)
    .eq("queue_date", today)
    .in("status", ["Waiting", "Called", "InConsult"])
    .order("checked_in_at", { ascending: true });

  const rows = (tickets ?? [])
    .map((t) => ({
      ticket_id: t.ticket_id,
      token_number: t.token_number,
      priority: t.priority,
      status: t.status,
      patientName:
        (t.patients as unknown as { profiles?: { full_name?: string } } | null)?.profiles?.full_name ??
        "Patient",
    }))
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-ink">Today&apos;s queue</h1>
      <div className="mt-6">
        <QueueBoard tickets={rows} />
      </div>
    </div>
  );
}
