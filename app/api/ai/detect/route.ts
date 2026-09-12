import { NextResponse } from "next/server";
import { detectLanguage } from "@/lib/ai/language-detect";

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "Missing 'text'" }, { status: 400 });
    }

    const detectedLanguage = detectLanguage(text);

    return NextResponse.json({ detectedLanguage });
  } catch (error) {
    console.error("Language detection failed:", error);
    return NextResponse.json({ error: "Detection failed" }, { status: 500 });
  }
}
