import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { RequestBoard } from "./request-board";

export const dynamic = "force-dynamic";

export default async function AmbulanceDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: ambulance } = await supabase
    .from("ambulances")
    .select("ambulance_id, is_available")
    .eq("driver_profile_id", user!.id)
    .single();

  // Unassigned requests became visible to on-duty drivers in migration
  // 005 (scoped to their district). Before that this query always came
  // back empty, which is why nobody could accept anything.
  const { data: openRequests } = await supabase
    .from("ambulance_requests")
    .select("request_id, pickup_latitude, pickup_longitude, status, requested_at")
    .eq("status", "Requested")
    .is("ambulance_id", null)
    .order("requested_at", { ascending: true });

  const { data: myActive } = await supabase
    .from("ambulance_requests")
    .select("request_id, pickup_latitude, pickup_longitude, status, requested_at")
    .eq("ambulance_id", ambulance?.ambulance_id ?? -1)
    .eq("status", "Dispatched")
    .order("requested_at", { ascending: true });

  const t = await getDictionary();

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-ink">{t("ambulance.dashboard.title")}</h1>
      <div className="mt-6">
        <RequestBoard
          ambulanceId={ambulance?.ambulance_id ?? 0}
          isAvailable={ambulance?.is_available ?? false}
          openRequests={openRequests ?? []}
          myActiveRequests={myActive ?? []}
        />
      </div>
    </div>
  );
}
