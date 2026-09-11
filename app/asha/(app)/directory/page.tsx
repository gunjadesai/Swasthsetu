import { createClient } from "@/lib/supabase/server";
import { DirectorySearch } from "./directory-search";

export default async function AshaDirectoryPage() {
  const supabase = await createClient();

  const { data: villages } = await supabase
    .from("villages")
    .select("village_id, village_name, districts(district_name)")
    .order("village_name");

  const { data: hospitals } = await supabase
    .from("hospitals")
    .select("hospital_id, name, facility_type, contact_number, has_emergency_services, districts(district_name)")
    .order("name");

  const villageRows = (villages ?? []).map((v) => ({
    id: v.village_id,
    label: v.village_name,
    sub: (v.districts as unknown as { district_name?: string } | null)?.district_name ?? "",
  }));

  const hospitalRows = (hospitals ?? []).map((h) => ({
    id: h.hospital_id,
    label: h.name,
    sub: `${h.facility_type} - ${(h.districts as unknown as { district_name?: string } | null)?.district_name ?? ""}${h.contact_number ? ` - ${h.contact_number}` : ""}${h.has_emergency_services ? " - Emergency services" : ""}`,
  }));

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-ink">Village &amp; hospital directory</h1>
      <div className="mt-6">
        <DirectorySearch villages={villageRows} hospitals={hospitalRows} />
      </div>
    </div>
  );
}
