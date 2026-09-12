import { NextResponse } from "next/server";
import { computeHealthIndex, toPublicReport } from "@/lib/health-index";

export const dynamic = "force-dynamic";

// Open, unauthenticated Public Health Index feed for district officials,
// researchers and dashboards. Only aggregates with small-cell suppression
// (lib/health-index.ts toPublicReport) - never patient-level data.
// Cached at the CDN for an hour so it can't be used to hammer the DB.
export async function GET() {
  try {
    const report = await computeHealthIndex();
    return NextResponse.json(toPublicReport(report), {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e) {
    console.error("[health-index] failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "The health index is not available right now." }, { status: 503 });
  }
}
