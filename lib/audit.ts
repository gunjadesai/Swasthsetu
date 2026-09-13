import type { SupabaseClient } from "@supabase/supabase-js";

// PHI access audit trail (who viewed/exported whose health record, and
// when). Writes to the existing audit_logs table - users can only insert
// rows for themselves (RLS, migration 003), only admins can read them.
// Best-effort by design: a failed audit write is logged to the server
// console but never blocks a doctor from seeing a patient's record.
export async function logPhiAccess(
  supabase: SupabaseClient,
  entry: {
    profileId: string | null;
    action: "view" | "export" | "create" | "sms" | "ivr" | "ussd";
    entityName: string;
    entityId: string | number;
    details?: string;
  }
) {
  const { error } = await supabase.from("audit_logs").insert({
    profile_id: entry.profileId,
    action: `phi.${entry.action}`,
    entity_name: entry.entityName,
    entity_id: String(entry.entityId),
    details: entry.details ?? null,
  });
  if (error) {
    console.error("[audit] could not record PHI access:", error.message);
  }
}
