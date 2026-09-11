"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function cancelAppointment(appointmentId: number) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("appointments")
    .update({ status: "Cancelled" })
    .eq("appointment_id", appointmentId)
    .eq("status", "Scheduled");

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/patient/appointments");
  revalidatePath("/patient/dashboard");
  return { error: null };
}
