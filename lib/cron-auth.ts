import { timingSafeEqual } from "crypto";

// Scheduled jobs (reminder dispatch today, anything else that runs
// without a signed-in user later) use the service-role client, which
// bypasses RLS entirely - so they must never run for an anonymous
// caller. CRON_SECRET is the only way in.
//
// Same shape as lib/telecom/verify.ts, and the same rule: with nothing
// configured the route answers 503 instead of running open. It used to
// treat a missing CRON_SECRET as "no authentication needed", which left
// a service-role endpoint on the public internet for anyone who could
// guess the path - they could push every pending reminder out (and burn
// the SMS credit) at will.
function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export type CronVerification = { ok: true } | { ok: false; status: number; message: string };

export function verifyCronRequest(request: Request): CronVerification {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return {
      ok: false,
      status: 503,
      message:
        "Scheduled jobs are not configured - set CRON_SECRET and send it as `Authorization: Bearer <secret>`.",
    };
  }

  // Vercel Cron sends the Authorization header; other schedulers can use
  // x-cron-secret. No ?key= query param on purpose: secrets in URLs end
  // up in server logs and browser history.
  const provided =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    request.headers.get("x-cron-secret") ??
    "";

  return safeEqual(provided, secret)
    ? { ok: true }
    : { ok: false, status: 401, message: "Unauthorized" };
}
