import { createBrowserClient } from "@supabase/ssr";

// Used inside Client Components ("use client"). Safe to call from the
// browser: it only ever holds the publishable/anon key, which Supabase
// designed to be public - real access control lives in Postgres RLS
// policies (see supabase/schema.sql), not in this key.
//
// Deliberately untyped: once you're set up, run
//   npx supabase gen types typescript --project-id <ref> > lib/database.types.ts
// and pass that as the generic here for full autocomplete + type safety.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
