import type { createClient } from "@/lib/supabase/server";
import { isMissingSchemaError } from "@/lib/supabase/schema-fallback";

// Phone numbers stopped being readable straight off `profiles` in
// migration 005: `authenticated` holds a column grant that excludes
// phone_number, and the database decides who gets it through
// profile_phone() - the owner, an administrator, a treating doctor, the
// registering ASHA, or an ambulance currently dispatched to them.
// Everyone else gets NULL back rather than an error, so a page that
// shows a phone when it has one simply shows nothing.
//
// Server-only: the RPC runs as the signed-in user, so it must go
// through the cookie-scoped client, never the browser one.

type ServerClient = Awaited<ReturnType<typeof createClient>>;

export async function getProfilePhone(
  supabase: ServerClient,
  profileId: string | null | undefined
): Promise<string | null> {
  if (!profileId) return null;

  const { data, error } = await supabase.rpc("profile_phone", { p_profile_id: profileId });
  if (!error) return (data as string | null) ?? null;

  // Migration 005 hasn't been run yet - the column is still readable, so
  // fall back to it rather than hiding a number the page needs (a doctor
  // ringing a patient on a keypad phone, say). Loud warning, because the
  // number is still world-readable until the migration runs.
  if (isMissingSchemaError(error)) {
    console.warn(
      "[schema] profile_phone() is missing - run supabase/migrations/005_open_issue_fixes.sql in the Supabase SQL Editor. " +
        "Until then every signed-in user can read every phone number."
    );
    const { data: row } = await supabase
      .from("profiles")
      .select("phone_number")
      .eq("id", profileId)
      .maybeSingle();
    return (row as { phone_number: string | null } | null)?.phone_number ?? null;
  }

  return null;
}

// Same thing for a list (an admin reviewing staff sign-ups). One RPC per
// profile, which is fine for the page-sized lists this is used on.
export async function getProfilePhones(
  supabase: ServerClient,
  profileIds: string[]
): Promise<Record<string, string | null>> {
  const entries = await Promise.all(
    profileIds.map(async (id) => [id, await getProfilePhone(supabase, id)] as const)
  );
  return Object.fromEntries(entries);
}
