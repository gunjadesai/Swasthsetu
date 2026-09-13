import { createClient } from "@/lib/supabase/server";
import { VisitForm } from "./visit-form";

export default async function AshaVisitsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: asha } = await supabase
    .from("asha_workers")
    .select("asha_id")
    .eq("profile_id", user!.id)
    .single();

  const { data: patients } = await supabase
    .from("patients")
    .select("patient_id, profiles(full_name)")
    .eq("registered_by_asha_id", asha?.asha_id ?? -1);

  const { data: visits } = await supabase
    .from("asha_field_visits")
    .select("visit_id, visit_date, purpose, is_synced_from_offline, patients(profiles(full_name))")
    .eq("asha_id", asha?.asha_id ?? -1)
    .order("visit_date", { ascending: false })
    .limit(20);

  const patientRows = (patients ?? []).map((p) => ({
    patient_id: p.patient_id,
    full_name: (p.profiles as unknown as { full_name?: string } | null)?.full_name ?? "Patient",
  }));

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold text-ink">Field visits</h1>
      <p className="mt-1 text-sm text-ink/70">
        Works offline - visits logged with no signal are saved on this
        device and sync automatically once you're back online.
      </p>

      <div className="mt-6 grid gap-8 sm:grid-cols-[minmax(0,320px)_1fr]">
        <VisitForm patients={patientRows} profileId={user!.id} />

        <div>
          <h2 className="text-sm font-semibold text-ink">Recent visits</h2>
          <div className="mt-3 space-y-2">
            {(visits ?? []).map((v) => (
              <div key={v.visit_id} className="rounded-md border border-line bg-surface p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-ink">
                    {(v.patients as unknown as { profiles?: { full_name?: string } } | null)?.profiles
                      ?.full_name ?? "Patient"}
                  </span>
                  <span className="text-xs text-ink/70">{v.visit_date}</span>
                </div>
                {v.purpose && <p className="mt-1 text-ink/70">{v.purpose}</p>}
                {v.is_synced_from_offline && (
                  <span className="mt-1 inline-block rounded-full bg-marigold-400/20 px-2 py-0.5 text-xs text-marigold-600">
                    Synced from offline
                  </span>
                )}
              </div>
            ))}
            {(!visits || visits.length === 0) && (
              <p className="text-sm text-ink/70">No visits logged yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
