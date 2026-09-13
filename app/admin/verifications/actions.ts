"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type VerificationDecision = "Verified" | "Rejected";

export async function setVerification(
  profileId: string,
  decision: VerificationDecision,
  note: string
): Promise<{ error?: string }> {
  if (decision !== "Verified" && decision !== "Rejected") return { error: "Invalid decision." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: me } = await supabase
    .from("profiles")
    .select("roles(role_name)")
    .eq("id", user.id)
    .single();
  if ((me?.roles as unknown as { role_name?: string } | null)?.role_name !== "Administrator") {
    return { error: "Only administrators can verify staff." };
  }
  if (profileId === user.id) return { error: "You can't verify your own account." };

  const trimmed = note.trim().slice(0, 500);
  if (decision === "Rejected" && !trimmed) {
    return { error: "Add a short reason so the person knows what to fix." };
  }

  // RLS (profiles_update_admin) and the profiles_guard_update trigger in
  // migration 004 also enforce that only an administrator can do this.
  const { data, error } = await supabase
    .from("profiles")
    .update({
      verification_status: decision,
      verified_by: user.id,
      verified_at: new Date().toISOString(),
      verification_note: trimmed || null,
    })
    .eq("id", profileId)
    .select("id");

  if (error) return { error: error.message };
  if (!data || data.length === 0) {
    return { error: "No change was saved - has supabase/migrations/004_high_priority_fixes.sql been run?" };
  }

  await supabase.from("audit_logs").insert({
    profile_id: user.id,
    action: decision === "Verified" ? "staff.verify" : "staff.reject",
    entity_name: "profiles",
    entity_id: profileId,
    details: trimmed || null,
  });

  revalidatePath("/admin/verifications");
  return {};
}
