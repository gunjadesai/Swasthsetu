import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import {
  INDICATOR_META,
  MIN_CELL_SIZE,
  computeHealthIndex,
  type DistrictIndex,
  type HealthGrade,
} from "@/lib/health-index";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

// Grade is always spelled out - the tint only reinforces the word.
const GRADE_STYLE: Record<HealthGrade, string> = {
  Good: "bg-success/10 text-success",
  Fair: "bg-marigold-500/15 text-marigold-600",
  "Needs attention": "bg-danger/10 text-danger",
  Critical: "bg-danger-solid text-white",
  "Insufficient data": "bg-sage-200 text-ink/70",
};

function share(value: number | null): string {
  return value === null ? "-" : `${value}%`;
}

function DistrictCard({ district, headline = false }: { district: DistrictIndex; headline?: boolean }) {
  const { context } = district;
  return (
    <Card className={cn(headline && "border-teal-600")}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className={cn("font-semibold text-ink", headline ? "text-lg" : "text-base")}>
            {district.districtName}
          </h2>
          {district.stateName && <p className="text-xs text-ink/70">{district.stateName}</p>}
          <span
            className={cn(
              "mt-2 inline-block rounded-sm px-2 py-0.5 text-xs font-medium",
              GRADE_STYLE[district.grade]
            )}
          >
            {district.grade}
          </span>
        </div>
        <p className="text-right">
          <span className={cn("font-bold tabular-nums text-teal-600", headline ? "text-5xl" : "text-4xl")}>
            {district.composite ?? "-"}
          </span>
          <span className="text-sm text-ink/70"> / 100</span>
        </p>
      </div>

      <p className="mt-3 text-xs text-ink/70">
        {context.patients} patients · {context.triages} symptom checks ({share(context.emergencyTriageShare)}{" "}
        emergencies, {share(context.phoneChannelTriageShare)} by voice/SMS/USSD/IVR) · {context.appointments}{" "}
        appointments ({share(context.remoteConsultShare)} voice/video)
      </p>

      <ul className="mt-4 space-y-3">
        {district.indicators.map((ind) => {
          const lowSample = ind.sampleSize < MIN_CELL_SIZE;
          return (
            <li
              key={ind.key}
              title={`${ind.label}: ${ind.score ?? "no data"}${ind.detail ? ` (${ind.detail})` : ""}. ${INDICATOR_META[ind.key].description}`}
              className={cn(lowSample && "opacity-50")}
            >
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-ink">{ind.label}</span>
                <span className="font-medium tabular-nums text-ink">{ind.score ?? "-"}</span>
              </div>
              <div
                role="meter"
                aria-label={ind.label}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={ind.score ?? undefined}
                className="mt-1 h-2 overflow-hidden rounded-full bg-sage-200"
              >
                {ind.score !== null && (
                  <div className="h-full rounded-full bg-primary" style={{ width: `${ind.score}%` }} />
                )}
              </div>
              <p className="mt-0.5 text-xs text-ink/70">
                {ind.detail ?? "No data yet"} · n={ind.sampleSize}
                {lowSample ? " - too few records, not in composite" : ""}
              </p>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

export default async function HealthIndexPage() {
  let report;
  try {
    report = await computeHealthIndex();
  } catch (e) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-2xl font-semibold text-ink">Public Health Index</h1>
        <Card className="mt-6">
          <p className="text-sm text-danger">
            {e instanceof Error ? e.message : "The health index could not be computed."}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Public Health Index</h1>
          <p className="mt-1 max-w-2xl text-sm text-ink/70">
            A 0-100 score per district built from the last {report.windowDays} days of platform activity -
            emergency response, appointments, referrals, vaccination, medicine stock and patient feedback.
            Aggregated and de-identified: no patient-level data appears here.
          </p>
        </div>
        <a
          href="/api/public-health-index"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-teal-600"
        >
          Open public data feed (JSON)
        </a>
      </div>

      <div className="mt-6">
        <DistrictCard district={report.overall} headline />
      </div>

      <h2 className="mt-8 text-lg font-semibold text-ink">By district</h2>
      <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {report.districts.map((d) => (
          <DistrictCard key={d.districtId ?? "unassigned"} district={d} />
        ))}
      </div>

      <p className="mt-6 text-xs text-ink/70">
        Composite = average of the indicators with at least {report.minCellSize} records; faded rows have too
        few and are left out. The public feed suppresses those cells entirely. Grades: 80+ Good, 60-79 Fair,
        40-59 Needs attention, below 40 Critical. Generated {format(new Date(report.generatedAt), "d MMM yyyy, HH:mm")}.
      </p>
    </div>
  );
}
