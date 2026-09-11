"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateAvatar(url: string, publicId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: url, avatar_cloudinary_public_id: publicId })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/patient/profile");
  revalidatePath("/doctor/profile");
  return { error: null };
}
