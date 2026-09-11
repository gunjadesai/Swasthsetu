import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client - bypasses Row Level Security entirely. Import
// this ONLY from trusted server-only code that has already verified
// the caller's identity/role itself (it does not use auth.uid()/cookies
// at all). Today that's exactly two call sites:
//   - app/asha/patients/register/actions.ts (creating an auth.users row
//     for a patient who has no email/device of their own)
//   - app/api/reminders/dispatch/route.ts (system job, no end-user session)
// Never import this into a Client Component or expose it to the browser.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set - grab it from the Supabase dashboard (Settings -> API) and add it to .env.local. It's required for ASHA-assisted patient registration and reminder dispatch."
    );
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
