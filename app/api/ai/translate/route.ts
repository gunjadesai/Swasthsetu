import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { locales } from "@/lib/i18n/dictionaries";
import { MAX_TRANSLATE_CHARS } from "@/lib/ai/translator";
import { translateOnServer } from "@/lib/ai/translator.server";

// Anyone who found this path could previously spend the project's AI
// budget on text of any length. Now: signed-in callers only, a length
// limit, a validated target language, and a small per-user rate limit.
const bodySchema = z.object({
  text: z.string().min(1).max(MAX_TRANSLATE_CHARS),
  from: z.enum(locales).optional(),
  to: z.enum(locales),
  mode: z.enum(["general", "medical", "simplify"]).optional(),
  context: z.string().max(200).optional(),
});

// Per-user sliding window. In-memory, so it resets on redeploy and is
// per serverless instance - enough to stop a stuck retry loop or a
// casual scrape, not a substitute for a real gateway limit.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;
const hits = new Map<string, number[]>();

function withinRateLimit(userId: string): boolean {
  const now = Date.now();
  const recent = (hits.get(userId) ?? []).filter((at) => now - at < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(userId, recent);
    return false;
  }
  recent.push(now);
  hits.set(userId, recent);
  return true;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  if (!withinRateLimit(user.id)) {
    return NextResponse.json({ error: "Too many translation requests - try again in a minute." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: `Send { text (1-${MAX_TRANSLATE_CHARS} chars), to: one of ${locales.join("/")} }` },
      { status: 400 }
    );
  }

  const result = await translateOnServer(parsed.data);

  // 200 with translated:false when no AI is configured - the caller
  // shows the original text rather than an error, and never a fake
  // "[HI] ..." string dressed up as a translation.
  return NextResponse.json({
    translatedText: result.text,
    translated: result.translated,
    reason: result.reason,
  });
}
