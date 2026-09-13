import { NextResponse } from "next/server";
import { detectLanguage } from "@/lib/ai/language-detect";
import { createClient } from "@/lib/supabase/server";

// Detection itself is a local script-range check (no AI bill attached),
// but there is no reason for it to answer anonymous callers either -
// signed-in only, with a length cap.
const MAX_CHARS = 2000;

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const { text } = await req.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Missing 'text'" }, { status: 400 });
    }
    if (text.length > MAX_CHARS) {
      return NextResponse.json({ error: `'text' must be ${MAX_CHARS} characters or fewer` }, { status: 400 });
    }

    const detectedLanguage = detectLanguage(text);

    return NextResponse.json({ detectedLanguage });
  } catch (error) {
    console.error("Language detection failed:", error);
    return NextResponse.json({ error: "Detection failed" }, { status: 500 });
  }
}
