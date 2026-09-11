import { createClient } from "@/lib/supabase/server";

async function count(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: string,
  match?: Record<string, string>
) {
  let query = supabase.from(table).select("*", { count: "exact", head: true });
  if (match) {
    for (const [key, value] of Object.entries(match)) {
      query = query.eq(key, value);
    }
  }
  const { count: c } = await query;
  return c ?? 0;
}

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const [
    appointments,
    pendingReferrals,
    openAmbulanceRequests,
    openFeedback,
    ashaWorkers,
    registeredPatients,
  ] = await Promise.all([
    count(supabase, "appointments"),
    count(supabase, "referrals", { status: "Pending" }),
    count(supabase, "ambulance_requests", { status: "Requested" }),
    count(supabase, "feedback", { status: "Open" }),
    count(supabase, "asha_workers"),
    count(supabase, "patients"),
  ]);

  const stats = [
    { label: "Total appointments", value: appointments },
    { label: "Pending referrals", value: pendingReferrals },
    { label: "Open ambulance requests", value: openAmbulanceRequests },
    { label: "Open feedback", value: openFeedback },
    { label: "ASHA workers onboarded", value: ashaWorkers },
    { label: "Registered patients", value: registeredPatients },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink">District overview</h1>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-line bg-white p-5">
            <p className="text-sm text-ink/60">{s.label}</p>
            <p className="mt-1 text-3xl font-bold text-teal-600">{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
