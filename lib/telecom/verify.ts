import { createHmac, timingSafeEqual } from "crypto";

// The SMS/USSD/IVR webhooks use the service-role client and can create
// ambulance requests, so they must never accept unauthenticated calls.
// Two ways in:
//   1. Twilio's X-Twilio-Signature (HMAC-SHA1 of the public URL + sorted
//      POST params, keyed with TWILIO_AUTH_TOKEN) - for SMS and IVR.
//   2. A shared secret (TELECOM_WEBHOOK_SECRET) in an x-webhook-secret
//      header or a ?key= query param - for USSD gateways and local
//      testing, since most USSD aggregators can't sign requests.
// With neither configured the routes answer 503 rather than running open.

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

// Twilio signs the URL it called. Behind Vercel/ngrok the request.url the
// app sees can differ (host, protocol), so PUBLIC_APP_URL pins it.
function publicUrl(request: Request): string {
  const url = new URL(request.url);
  const base = process.env.PUBLIC_APP_URL;
  return base ? new URL(url.pathname + url.search, base).toString() : url.toString();
}

function twilioSignature(authToken: string, url: string, params: Record<string, string>): string {
  const data = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], url);
  return createHmac("sha1", authToken).update(Buffer.from(data, "utf-8")).digest("base64");
}

export type WebhookVerification = { ok: true } | { ok: false; status: number; message: string };

export function verifyTelecomWebhook(
  request: Request,
  params: Record<string, string>
): WebhookVerification {
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const sharedSecret = process.env.TELECOM_WEBHOOK_SECRET;
  const signature = request.headers.get("x-twilio-signature");

  if (signature && twilioToken) {
    return safeEqual(signature, twilioSignature(twilioToken, publicUrl(request), params))
      ? { ok: true }
      : { ok: false, status: 403, message: "Invalid Twilio signature." };
  }

  if (sharedSecret) {
    const provided =
      request.headers.get("x-webhook-secret") ?? new URL(request.url).searchParams.get("key") ?? "";
    return safeEqual(provided, sharedSecret)
      ? { ok: true }
      : { ok: false, status: 403, message: "Invalid webhook secret." };
  }

  if (!twilioToken) {
    return {
      ok: false,
      status: 503,
      message: "Telecom webhooks are not configured - set TWILIO_AUTH_TOKEN or TELECOM_WEBHOOK_SECRET.",
    };
  }
  return { ok: false, status: 403, message: "Missing Twilio signature." };
}

export async function readFormParams(request: Request): Promise<Record<string, string>> {
  const form = await request.formData();
  const params: Record<string, string> = {};
  form.forEach((value, key) => {
    if (typeof value === "string") params[key] = value;
  });
  return params;
}
