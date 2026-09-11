"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateStock(pharmacyId: number, medicineId: number, quantity: number) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("medicine_availability")
    .upsert(
      { pharmacy_id: pharmacyId, medicine_id: medicineId, stock_quantity: quantity, last_updated: new Date().toISOString() },
      { onConflict: "pharmacy_id,medicine_id" }
    );
  if (error) throw new Error(error.message);
  revalidatePath("/pharmacy/dashboard");
}
