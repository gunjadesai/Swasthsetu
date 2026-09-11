"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateReferralStatus(referralId: number, status: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("referrals").update({ status }).eq("referral_id", referralId);
  if (error) throw new Error(error.message);
  revalidatePath("/hospital/referrals");
}
