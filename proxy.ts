import { type NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { RoleName } from "@/lib/types";

// Every role's own section and the dashboard it's redirected home to.
// Keeping this as one map (instead of one if-block per role) is what
// lets the proxy stay flat as roles are added across Phases 2-6.
const ROLE_HOME: Record<RoleName, string> = {
  Patient: "/patient/dashboard",
  ASHAWorker: "/asha/dashboard",
  Doctor: "/doctor/dashboard",
  HospitalStaff: "/hospital/dashboard",
  LabStaff: "/lab/dashboard",
  PharmacyStaff: "/pharmacy/dashboard",
  AmbulanceProvider: "/ambulance/dashboard",
  Administrator: "/admin/dashboard",
};

const PROTECTED_PREFIXES = [
  "/patient",
  "/asha",
  "/doctor",
  "/hospital",
  "/lab",
  "/pharmacy",
  "/ambulance",
  "/admin",
];

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[]
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAuthRoute = path.startsWith("/login") || path.startsWith("/signup");
  const isProtectedRoute = PROTECTED_PREFIXES.some((prefix) =>
    path.startsWith(prefix)
  );

  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // Keep each role inside its own section - one extra query, only on
  // the routes where it matters.
  if (user && isProtectedRoute) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("roles(role_name)")
      .eq("id", user.id)
      .single();

    const roleName = (profile?.roles as { role_name?: string } | null)
      ?.role_name as RoleName | undefined;

    const ownPrefix = roleName ? ROLE_HOME[roleName]?.split("/")[1] : undefined;
    const matchedPrefix = PROTECTED_PREFIXES.find((prefix) =>
      path.startsWith(prefix)
    );

    if (
      roleName &&
      ownPrefix &&
      matchedPrefix &&
      matchedPrefix !== `/${ownPrefix}`
    ) {
      const url = request.nextUrl.clone();
      url.pathname = ROLE_HOME[roleName];
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
