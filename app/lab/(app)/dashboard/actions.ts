"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function markSampleCollected(orderId: number) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("lab_test_orders")
    .update({ status: "SampleCollected" })
    .eq("order_id", orderId);
  if (error) throw new Error(error.message);
  revalidatePath("/lab/dashboard");
}

export async function attachLabResult(
  orderId: number,
  resultSummary: string,
  url: string,
  publicId: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { error: attachError } = await supabase.from("attachments").insert({
    owner_profile_id: user.id,
    related_table: "lab_test_orders",
    related_id: String(orderId),
    cloudinary_public_id: publicId,
    url,
    file_type: "image",
  });
  if (attachError) throw new Error(attachError.message);

  const { error: orderError } = await supabase
    .from("lab_test_orders")
    .update({ status: "ResultReady", result_summary: resultSummary, result_file_path: url })
    .eq("order_id", orderId);
  if (orderError) throw new Error(orderError.message);

  revalidatePath("/lab/dashboard");
}
