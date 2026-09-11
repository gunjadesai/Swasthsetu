import { createClient } from "@/lib/supabase/server";

export default async function AshaDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: asha } = await supabase
    .from("asha_workers")
    .select("asha_id, villages(village_name)")
    .eq("profile_id", user!.id)
    .single();

  const { count: patientCount } = await supabase
    .from("patients")
    .select("patient_id", { count: "exact", head: true })
    .eq("registered_by_asha_id", asha?.asha_id ?? -1);

  const { count: visitCount } = await supabase
    .from("asha_field_visits")
    .select("visit_id", { count: "exact", head: true })
    .eq("asha_id", asha?.asha_id ?? -1);

  const villageName = (asha?.villages as unknown as { village_name?: string } | null)
    ?.village_name;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink">
        {villageName ? `${villageName} - ASHA overview` : "ASHA overview"}
      </h1>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-line bg-white p-5">
          <p className="text-sm text-ink/60">Patients you've registered</p>
          <p className="mt-1 text-3xl font-bold text-teal-600">{patientCount ?? 0}</p>
        </div>
        <div className="rounded-lg border border-line bg-white p-5">
          <p className="text-sm text-ink/60">Field visits logged</p>
          <p className="mt-1 text-3xl font-bold text-teal-600">{visitCount ?? 0}</p>
        </div>
      </div>
    </div>
  );
}
