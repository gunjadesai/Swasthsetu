import { createClient } from "@/lib/supabase/server";

export default async function HospitalDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: staff } = await supabase
    .from("hospital_staff")
    .select("hospital_id, hospitals(name)")
    .eq("profile_id", user!.id)
    .single();

  const today = new Date().toISOString().slice(0, 10);
  const hospitalId = staff?.hospital_id ?? -1;

  const { count: waitingCount } = await supabase
    .from("queue_tickets")
    .select("ticket_id", { count: "exact", head: true })
    .eq("hospital_id", hospitalId)
    .eq("queue_date", today)
    .in("status", ["Waiting", "Called"]);

  const { count: pendingReferrals } = await supabase
    .from("referrals")
    .select("referral_id", { count: "exact", head: true })
    .eq("referred_to_hospital_id", hospitalId)
    .eq("status", "Pending");

  const { count: openFeedback } = await supabase
    .from("feedback")
    .select("feedback_id", { count: "exact", head: true })
    .eq("hospital_id", hospitalId)
    .eq("status", "Open");

  const hospitalName = (staff?.hospitals as unknown as { name?: string } | null)?.name;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink">{hospitalName ?? "Hospital overview"}</h1>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-line bg-white p-5">
          <p className="text-sm text-ink/60">Waiting in queue today</p>
          <p className="mt-1 text-3xl font-bold text-teal-600">{waitingCount ?? 0}</p>
        </div>
        <div className="rounded-lg border border-line bg-white p-5">
          <p className="text-sm text-ink/60">Pending referrals in</p>
          <p className="mt-1 text-3xl font-bold text-teal-600">{pendingReferrals ?? 0}</p>
        </div>
        <div className="rounded-lg border border-line bg-white p-5">
          <p className="text-sm text-ink/60">Open feedback</p>
          <p className="mt-1 text-3xl font-bold text-teal-600">{openFeedback ?? 0}</p>
        </div>
      </div>
    </div>
  );
}
