import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { MedicineSearchForm } from "./search-form";

export default async function MedicineSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();
  const t = await getDictionary();

  let results: {
    availability_id: number;
    stock_quantity: number;
    medicine_catalog: { medicine_name: string } | null;
    pharmacies: { name: string; districts: { district_name: string } | null } | null;
  }[] = [];

  if (q && q.trim()) {
    const { data } = await supabase
      .from("medicine_availability")
      .select(
        "availability_id, stock_quantity, medicine_catalog!inner(medicine_name), pharmacies(name, districts(district_name))"
      )
      .gt("stock_quantity", 0)
      .ilike("medicine_catalog.medicine_name", `%${q.trim()}%`);
    results = (data ?? []) as unknown as typeof results;
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-ink">{t("nav.medicineSearch")}</h1>
      <div className="mt-6">
        <MedicineSearchForm defaultValue={q ?? ""} />
      </div>

      <div className="mt-6 space-y-2">
        {results
          .filter((r) => r.medicine_catalog)
          .map((r) => (
            <div key={r.availability_id} className="rounded-md border border-line bg-surface p-3 text-sm">
              <p className="font-medium text-ink">{r.medicine_catalog?.medicine_name}</p>
              <p className="text-ink/70">
                {r.pharmacies?.name}
                {r.pharmacies?.districts?.district_name ? ` - ${r.pharmacies.districts.district_name}` : ""}
              </p>
              <p className="text-xs text-success">{r.stock_quantity} in stock</p>
            </div>
          ))}
        {q && results.length === 0 && (
          <p className="text-sm text-ink/70">No pharmacy currently has that in stock.</p>
        )}
      </div>
    </div>
  );
}
