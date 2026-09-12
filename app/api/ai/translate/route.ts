import { NextResponse } from "next/server";
import { translateText } from "@/lib/ai/translator";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { text, from, to, mode, context } = body;

    if (!text || !to) {
      return NextResponse.json(
        { error: "Missing required fields: 'text' and 'to'" },
        { status: 400 }
      );
    }

    const translatedText = await translateText({ text, from, to, mode, context });

    return NextResponse.json({ translatedText });
  } catch (error) {
    console.error("Translation API Error:", error);
    return NextResponse.json({ error: "Translation failed" }, { status: 500 });
  }
}
