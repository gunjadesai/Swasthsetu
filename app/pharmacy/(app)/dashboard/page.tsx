import { createClient } from "@/lib/supabase/server";
import { StockRow } from "./stock-row";

export default async function PharmacyDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: staff } = await supabase
    .from("pharmacy_staff")
    .select("pharmacy_id, pharmacies(name)")
    .eq("profile_id", user!.id)
    .single();

  const pharmacyId = staff?.pharmacy_id ?? -1;

  const { data: catalog } = await supabase
    .from("medicine_catalog")
    .select("medicine_id, medicine_name")
    .order("medicine_name");

  const { data: availability } = await supabase
    .from("medicine_availability")
    .select("medicine_id, stock_quantity")
    .eq("pharmacy_id", pharmacyId);

  const stockByMedicine = new Map((availability ?? []).map((a) => [a.medicine_id, a.stock_quantity]));
  const pharmacyName = (staff?.pharmacies as unknown as { name?: string } | null)?.name;

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold text-ink">{pharmacyName ?? "Medicine stock"}</h1>
      <div className="mt-6 space-y-2">
        {(catalog ?? []).map((m) => (
          <StockRow
            key={m.medicine_id}
            pharmacyId={pharmacyId}
            medicineId={m.medicine_id}
            medicineName={m.medicine_name}
            initialQuantity={stockByMedicine.get(m.medicine_id) ?? 0}
          />
        ))}
      </div>
    </div>
  );
}
