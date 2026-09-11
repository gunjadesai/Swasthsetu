"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function resolveFeedback(feedbackId: number, status: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("feedback").update({ status }).eq("feedback_id", feedbackId);
  if (error) throw new Error(error.message);
  revalidatePath("/hospital/feedback");
}
