import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
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
  const isProtectedRoute =
    path.startsWith("/patient") || path.startsWith("/doctor");

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

  // Keep a patient out of /doctor/* and vice versa - one extra query,
  // only on the routes where it matters.
  if (user && isProtectedRoute) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("roles(role_name)")
      .eq("id", user.id)
      .single();

    const roleName = (profile?.roles as { role_name?: string } | null)
      ?.role_name;

    if (path.startsWith("/patient") && roleName && roleName !== "Patient") {
      const url = request.nextUrl.clone();
      url.pathname = "/doctor/dashboard";
      return NextResponse.redirect(url);
    }
    if (path.startsWith("/doctor") && roleName && roleName !== "Doctor") {
      const url = request.nextUrl.clone();
      url.pathname = "/patient/dashboard";
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
