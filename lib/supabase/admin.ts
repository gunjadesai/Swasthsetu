import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client - bypasses Row Level Security entirely. Import
// this ONLY from trusted server-only code that has already verified
// the caller's identity/role itself (it does not use auth.uid()/cookies
// at all). Today's call sites:
//   - app/asha/patients/register/actions.ts (creating an auth.users row
//     for a patient who has no email/device of their own)
//   - app/api/reminders/dispatch/route.ts (system job, no end-user session)
//   - lib/telecom/* via app/api/sms, app/api/ussd, app/api/ivr (keypad-
//     phone webhooks; the request signature/secret is verified first and
//     the caller is identified only by their registered phone number)
//   - lib/health-index.ts (district aggregates for admins and the public,
//     de-identified with small-cell suppression)
// Never import this into a Client Component or expose it to the browser.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set - grab it from the Supabase dashboard (Settings -> API) and add it to .env.local. It's required for ASHA-assisted patient registration, reminder dispatch, the SMS/USSD/IVR lines and the Public Health Index."
    );
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
