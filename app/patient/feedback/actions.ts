"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type FeedbackState = { error?: string; success?: boolean };

export async function submitFeedback(
  _prevState: FeedbackState,
  formData: FormData
): Promise<FeedbackState> {
  const hospitalId = formData.get("hospitalId");
  const category = String(formData.get("category") ?? "General");
  const rating = formData.get("rating");
  const comments = String(formData.get("comments") ?? "").trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase.from("feedback").insert({
    profile_id: user.id,
    hospital_id: hospitalId ? Number(hospitalId) : null,
    category,
    rating: rating ? Number(rating) : null,
    comments: comments || null,
  });

  if (error) return { error: error.message };

  revalidatePath("/patient/feedback");
  return { success: true };
}
