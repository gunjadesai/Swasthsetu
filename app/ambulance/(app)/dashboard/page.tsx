import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { RequestBoard } from "./request-board";

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
    .eq("status", "Dispatched");

  const mapRow = (r: { request_id: number; pickup_latitude: number | null; pickup_longitude: number | null; status: string; requested_at: string }) => ({
    ...r,
    mine: false,
  });

  const t = await getDictionary();

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-ink">{t("ambulance.dashboard.title")}</h1>
      <div className="mt-6">
        <RequestBoard
          ambulanceId={ambulance?.ambulance_id ?? 0}
          isAvailable={ambulance?.is_available ?? false}
          openRequests={(openRequests ?? []).map(mapRow)}
          myActiveRequests={(myActive ?? []).map(mapRow)}
        />
      </div>
    </div>
  );
}
