import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

// Used inside Server Components, Server Actions, and Route Handlers.
// Reads/writes the session via cookies so RLS policies see the real
// signed-in user (auth.uid()) on every query - this is what makes the
// database-level access rules in supabase/schema.sql actually apply.
//
// Deliberately untyped - see lib/supabase/client.ts for how to add
// generated types once the project is set up.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[]
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component during render - safe to
            // ignore because proxy.ts refreshes the session on
            // every request anyway.
          }
        },
      },
    }
  );
}
