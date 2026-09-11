import { createClient } from "@/lib/supabase/server";
import { OrderRow } from "./order-row";

export default async function LabDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: staff } = await supabase
    .from("lab_staff")
    .select("lab_id, laboratories(name)")
    .eq("profile_id", user!.id)
    .single();

  const { data: orders } = await supabase
    .from("lab_test_orders")
    .select("order_id, status, patients(profiles(full_name)), lab_test_catalog(test_name)")
    .eq("lab_id", staff?.lab_id ?? -1)
    .in("status", ["Ordered", "SampleCollected"])
    .order("created_at", { ascending: true });

  const rows = (orders ?? []).map((o) => ({
    order_id: o.order_id,
    status: o.status,
    patientName:
      (o.patients as unknown as { profiles?: { full_name?: string } } | null)?.profiles?.full_name ??
      "Patient",
    testName: (o.lab_test_catalog as unknown as { test_name?: string } | null)?.test_name ?? "Test",
  }));

  const labName = (staff?.laboratories as unknown as { name?: string } | null)?.name;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-ink">{labName ?? "Lab orders"}</h1>
      <div className="mt-6 space-y-2">
        {rows.map((o) => (
          <OrderRow key={o.order_id} order={o} />
        ))}
        {rows.length === 0 && <p className="text-sm text-ink/50">No pending orders.</p>}
      </div>
    </div>
  );
}
