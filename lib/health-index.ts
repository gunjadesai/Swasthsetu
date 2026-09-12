import { createAdminClient } from "@/lib/supabase/admin";

// Public Health Index - a district-level 0-100 composite of how well the
// public health system is serving people, computed from platform activity.
//
// Six indicators, each scored 0-100 (higher = better):
//   emergencyResponse      ambulance requests completed + median minutes to dispatch
//   appointmentCompletion  past appointments that happened (not cancelled / no-show)
//   referralCompletion     referrals accepted or completed by the receiving facility
//   vaccinationCoverage    doses due in the last year that were given
//   medicineAvailability   catalogue medicines in stock at a district pharmacy
//   patientSatisfaction    average feedback rating (1-5 scaled to 0-100)
// Composite = mean of the indicators that have at least MIN_CELL_SIZE records.
//
// Only aggregates ever leave this module. toPublicReport() additionally
// suppresses every cell built from fewer than MIN_CELL_SIZE records, so
// the public feed can't be used to single out an individual patient.
//
// Uses the service-role client because aggregates span every patient;
// callers are the admin page (role-checked in app/admin/layout.tsx) and
// the public API (suppressed output only).

export const HEALTH_INDEX_WINDOW_DAYS = 90;
export const MIN_CELL_SIZE = 5;

const DAY_MS = 86_400_000;
const UNASSIGNED = "unassigned";

export type IndicatorKey =
  | "emergencyResponse"
  | "appointmentCompletion"
  | "referralCompletion"
  | "vaccinationCoverage"
  | "medicineAvailability"
  | "patientSatisfaction";

export const INDICATOR_META: Record<IndicatorKey, { label: string; description: string }> = {
  emergencyResponse: {
    label: "Emergency response",
    description: "Ambulance requests completed, and the median minutes until an ambulance was dispatched.",
  },
  appointmentCompletion: {
    label: "Appointment completion",
    description: "Past appointments that actually took place rather than being cancelled or missed.",
  },
  referralCompletion: {
    label: "Referral follow-through",
    description: "Referrals accepted or completed by the receiving facility.",
  },
  vaccinationCoverage: {
    label: "Vaccination coverage",
    description: "Vaccine doses due in the last 12 months that were given.",
  },
  medicineAvailability: {
    label: "Essential medicine availability",
    description: "Catalogue medicines in stock at one or more pharmacies in the district.",
  },
  patientSatisfaction: {
    label: "Patient satisfaction",
    description: "Average feedback rating from patients, 1-5 scaled to 0-100.",
  },
};

export type Indicator = {
  key: IndicatorKey;
  label: string;
  score: number | null;
  detail: string | null;
  sampleSize: number;
};

export type HealthGrade = "Good" | "Fair" | "Needs attention" | "Critical" | "Insufficient data";

export type DistrictIndex = {
  districtId: number | null;
  districtName: string;
  stateName: string | null;
  composite: number | null;
  grade: HealthGrade;
  indicators: Indicator[];
  context: {
    patients: number;
    appointments: number;
    triages: number;
    emergencyTriageShare: number | null;
    phoneChannelTriageShare: number | null;
    remoteConsultShare: number | null;
  };
};

export type HealthIndexReport = {
  generatedAt: string;
  windowDays: number;
  minCellSize: number;
  overall: DistrictIndex;
  districts: DistrictIndex[];
};

type PageResult<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

// Supabase caps a response at 1000 rows - page through everything.
async function selectAll<T>(query: (from: number, to: number) => PageResult<T>): Promise<T[]> {
  const pageSize = 1000;
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await query(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) return rows;
  }
}

type Acc = {
  patients: number;
  ambulanceSettled: number;
  ambulanceCompleted: number;
  dispatchMinutes: number[];
  appointments: number;
  remoteAppointments: number;
  pastAppointments: number;
  completedAppointments: number;
  referrals: number;
  referralsFollowedThrough: number;
  vaccinesDue: number;
  vaccinesGiven: number;
  pharmacies: number;
  stockedMedicines: Set<number>;
  ratings: number[];
  triages: number;
  emergencyTriages: number;
  phoneChannelTriages: number;
};

function newAcc(): Acc {
  return {
    patients: 0,
    ambulanceSettled: 0,
    ambulanceCompleted: 0,
    dispatchMinutes: [],
    appointments: 0,
    remoteAppointments: 0,
    pastAppointments: 0,
    completedAppointments: 0,
    referrals: 0,
    referralsFollowedThrough: 0,
    vaccinesDue: 0,
    vaccinesGiven: 0,
    pharmacies: 0,
    stockedMedicines: new Set(),
    ratings: [],
    triages: 0,
    emergencyTriages: 0,
    phoneChannelTriages: 0,
  };
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function percent(numerator: number, denominator: number): number | null {
  return denominator > 0 ? Math.round((numerator / denominator) * 100) : null;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function gradeFor(composite: number | null): HealthGrade {
  if (composite === null) return "Insufficient data";
  if (composite >= 80) return "Good";
  if (composite >= 60) return "Fair";
  if (composite >= 40) return "Needs attention";
  return "Critical";
}

function indicator(key: IndicatorKey, score: number | null, detail: string | null, sampleSize: number): Indicator {
  return { key, label: INDICATOR_META[key].label, score, detail, sampleSize };
}

function buildIndex(
  acc: Acc,
  place: { districtId: number | null; districtName: string; stateName: string | null },
  catalogCount: number
): DistrictIndex {
  // Emergency response: completion rate and dispatch speed (15 min or
  // less scores 100, 90 min or more scores 0), averaged.
  const completion = acc.ambulanceSettled > 0 ? acc.ambulanceCompleted / acc.ambulanceSettled : null;
  const dispatch = median(acc.dispatchMinutes);
  const emergencyParts: string[] = [];
  const emergencyScores: number[] = [];
  if (completion !== null) {
    emergencyScores.push(completion * 100);
    emergencyParts.push(`${Math.round(completion * 100)}% completed`);
  }
  if (dispatch !== null) {
    emergencyScores.push(clamp(((90 - dispatch) / 75) * 100));
    emergencyParts.push(`median dispatch ${Math.round(dispatch)} min`);
  }

  const avgRating = acc.ratings.length ? acc.ratings.reduce((s, r) => s + r, 0) / acc.ratings.length : null;

  const indicators: Indicator[] = [
    indicator(
      "emergencyResponse",
      emergencyScores.length ? Math.round(emergencyScores.reduce((s, v) => s + v, 0) / emergencyScores.length) : null,
      emergencyParts.length ? emergencyParts.join(" · ") : null,
      Math.max(acc.ambulanceSettled, acc.dispatchMinutes.length)
    ),
    indicator(
      "appointmentCompletion",
      percent(acc.completedAppointments, acc.pastAppointments),
      acc.pastAppointments ? `${acc.completedAppointments} of ${acc.pastAppointments} took place` : null,
      acc.pastAppointments
    ),
    indicator(
      "referralCompletion",
      percent(acc.referralsFollowedThrough, acc.referrals),
      acc.referrals ? `${acc.referralsFollowedThrough} of ${acc.referrals} accepted or completed` : null,
      acc.referrals
    ),
    indicator(
      "vaccinationCoverage",
      percent(acc.vaccinesGiven, acc.vaccinesDue),
      acc.vaccinesDue ? `${acc.vaccinesGiven} of ${acc.vaccinesDue} due doses given` : null,
      acc.vaccinesDue
    ),
    indicator(
      "medicineAvailability",
      acc.pharmacies > 0 ? percent(acc.stockedMedicines.size, catalogCount) : null,
      acc.pharmacies > 0 && catalogCount ? `${acc.stockedMedicines.size} of ${catalogCount} medicines in stock` : null,
      acc.pharmacies > 0 ? catalogCount : 0
    ),
    indicator(
      "patientSatisfaction",
      avgRating !== null ? Math.round(((avgRating - 1) / 4) * 100) : null,
      avgRating !== null ? `${avgRating.toFixed(1)} / 5 average` : null,
      acc.ratings.length
    ),
  ];

  const scored = indicators.filter((i) => i.score !== null && i.sampleSize >= MIN_CELL_SIZE);
  const composite = scored.length
    ? Math.round(scored.reduce((s, i) => s + (i.score ?? 0), 0) / scored.length)
    : null;

  return {
    ...place,
    composite,
    grade: gradeFor(composite),
    indicators,
    context: {
      patients: acc.patients,
      appointments: acc.appointments,
      triages: acc.triages,
      emergencyTriageShare: percent(acc.emergencyTriages, acc.triages),
      phoneChannelTriageShare: percent(acc.phoneChannelTriages, acc.triages),
      remoteConsultShare: percent(acc.remoteAppointments, acc.appointments),
    },
  };
}

export async function computeHealthIndex(now = new Date()): Promise<HealthIndexReport> {
  const admin = createAdminClient();
  const sinceIso = new Date(now.getTime() - HEALTH_INDEX_WINDOW_DAYS * DAY_MS).toISOString();
  const sinceDate = sinceIso.slice(0, 10);
  const today = now.toISOString().slice(0, 10);
  const vaccinationSince = new Date(now.getTime() - 365 * DAY_MS).toISOString().slice(0, 10);
  // Requests younger than a day may still be in progress - don't count
  // them as "not completed" yet.
  const settledBefore = now.getTime() - DAY_MS;

  const [
    districts,
    villages,
    hospitals,
    doctors,
    ashas,
    patients,
    ambulances,
    pharmacies,
    requests,
    appointments,
    referrals,
    vaccinations,
    stock,
    feedback,
    triages,
    catalog,
  ] = await Promise.all([
    selectAll<{ district_id: number; district_name: string; states: unknown }>((a, b) =>
      admin.from("districts").select("district_id, district_name, states(state_name)").range(a, b)
    ),
    selectAll<{ village_id: number; district_id: number }>((a, b) =>
      admin.from("villages").select("village_id, district_id").range(a, b)
    ),
    selectAll<{ hospital_id: number; district_id: number }>((a, b) =>
      admin.from("hospitals").select("hospital_id, district_id").range(a, b)
    ),
    selectAll<{ doctor_id: number; primary_hospital_id: number | null }>((a, b) =>
      admin.from("doctors").select("doctor_id, primary_hospital_id").range(a, b)
    ),
    selectAll<{ asha_id: number; assigned_village_id: number }>((a, b) =>
      admin.from("asha_workers").select("asha_id, assigned_village_id").range(a, b)
    ),
    selectAll<{ patient_id: number; registered_by_asha_id: number | null; profiles: unknown }>((a, b) =>
      admin.from("patients").select("patient_id, registered_by_asha_id, profiles(village_id)").range(a, b)
    ),
    selectAll<{ ambulance_id: number; district_id: number }>((a, b) =>
      admin.from("ambulances").select("ambulance_id, district_id").range(a, b)
    ),
    selectAll<{ pharmacy_id: number; district_id: number }>((a, b) =>
      admin.from("pharmacies").select("pharmacy_id, district_id").range(a, b)
    ),
    selectAll<{
      patient_id: number | null;
      ambulance_id: number | null;
      status: string;
      requested_at: string;
      dispatched_at: string | null;
    }>((a, b) =>
      admin
        .from("ambulance_requests")
        .select("patient_id, ambulance_id, status, requested_at, dispatched_at")
        .gte("requested_at", sinceIso)
        .range(a, b)
    ),
    selectAll<{
      patient_id: number;
      doctor_id: number;
      hospital_id: number | null;
      status: string;
      mode: string;
      appointment_date: string;
    }>((a, b) =>
      admin
        .from("appointments")
        .select("patient_id, doctor_id, hospital_id, status, mode, appointment_date")
        .gte("appointment_date", sinceDate)
        .range(a, b)
    ),
    selectAll<{ referred_to_hospital_id: number; status: string }>((a, b) =>
      admin.from("referrals").select("referred_to_hospital_id, status").gte("created_at", sinceIso).range(a, b)
    ),
    selectAll<{ patient_id: number; status: string; scheduled_date: string }>((a, b) =>
      admin
        .from("vaccination_records")
        .select("patient_id, status, scheduled_date")
        .gte("scheduled_date", vaccinationSince)
        .lte("scheduled_date", today)
        .range(a, b)
    ),
    selectAll<{ pharmacy_id: number; medicine_id: number }>((a, b) =>
      admin.from("medicine_availability").select("pharmacy_id, medicine_id").gt("stock_quantity", 0).range(a, b)
    ),
    selectAll<{ hospital_id: number | null; rating: number | null }>((a, b) =>
      admin
        .from("feedback")
        .select("hospital_id, rating")
        .gte("created_at", sinceIso)
        .not("rating", "is", null)
        .range(a, b)
    ),
    selectAll<{ patient_id: number; urgency_level: string; channel: string | null }>((a, b) =>
      admin
        .from("triage_assessments")
        .select("patient_id, urgency_level, channel")
        .gte("created_at", sinceIso)
        .range(a, b)
    ),
    admin.from("medicine_catalog").select("medicine_id", { count: "exact", head: true }),
  ]);

  const catalogCount = catalog.count ?? 0;
  const villageDistrict = new Map(villages.map((v) => [v.village_id, v.district_id]));
  const hospitalDistrict = new Map(hospitals.map((h) => [h.hospital_id, h.district_id]));
  const doctorHospital = new Map(doctors.map((d) => [d.doctor_id, d.primary_hospital_id]));
  const ashaVillage = new Map(ashas.map((a) => [a.asha_id, a.assigned_village_id]));
  const ambulanceDistrict = new Map(ambulances.map((a) => [a.ambulance_id, a.district_id]));
  const pharmacyDistrict = new Map(pharmacies.map((p) => [p.pharmacy_id, p.district_id]));

  // A patient belongs to their own village's district, or else to the
  // village of the ASHA who registered them.
  const patientDistrict = new Map<number, number | null>();
  for (const p of patients) {
    const ownVillage = (p.profiles as { village_id: number | null } | null)?.village_id ?? null;
    const village = ownVillage ?? (p.registered_by_asha_id ? ashaVillage.get(p.registered_by_asha_id) ?? null : null);
    patientDistrict.set(p.patient_id, village !== null ? villageDistrict.get(village) ?? null : null);
  }

  const accs = new Map<string, Acc>();
  const overall = newAcc();
  const touch = (districtId: number | null | undefined, update: (acc: Acc) => void) => {
    const key = districtId === null || districtId === undefined ? UNASSIGNED : String(districtId);
    let acc = accs.get(key);
    if (!acc) {
      acc = newAcc();
      accs.set(key, acc);
    }
    update(acc);
    update(overall);
  };

  for (const p of patients) touch(patientDistrict.get(p.patient_id), (a) => a.patients++);
  for (const p of pharmacies) touch(p.district_id, (a) => a.pharmacies++);

  for (const r of requests) {
    if (r.status === "Cancelled") continue;
    const district =
      (r.patient_id ? patientDistrict.get(r.patient_id) : null) ??
      (r.ambulance_id ? ambulanceDistrict.get(r.ambulance_id) : null) ??
      null;
    const requestedAt = Date.parse(r.requested_at);
    const dispatchMinutes = r.dispatched_at ? (Date.parse(r.dispatched_at) - requestedAt) / 60_000 : null;
    touch(district, (a) => {
      if (requestedAt < settledBefore) {
        a.ambulanceSettled++;
        if (r.status === "Completed") a.ambulanceCompleted++;
      }
      if (dispatchMinutes !== null && dispatchMinutes >= 0) a.dispatchMinutes.push(dispatchMinutes);
    });
  }

  for (const appt of appointments) {
    const doctorHospitalId = doctorHospital.get(appt.doctor_id);
    const district =
      (appt.hospital_id ? hospitalDistrict.get(appt.hospital_id) : null) ??
      (doctorHospitalId ? hospitalDistrict.get(doctorHospitalId) : null) ??
      patientDistrict.get(appt.patient_id) ??
      null;
    touch(district, (a) => {
      a.appointments++;
      if (appt.mode !== "InPerson") a.remoteAppointments++;
      if (appt.appointment_date < today && appt.status !== "Scheduled") {
        a.pastAppointments++;
        if (appt.status === "Completed") a.completedAppointments++;
      }
    });
  }

  for (const r of referrals) {
    if (r.status === "Cancelled") continue;
    touch(hospitalDistrict.get(r.referred_to_hospital_id), (a) => {
      a.referrals++;
      if (r.status === "Accepted" || r.status === "Completed") a.referralsFollowedThrough++;
    });
  }

  for (const v of vaccinations) {
    const due = v.status === "Completed" || v.status === "Missed" || v.scheduled_date < today;
    if (!due) continue;
    touch(patientDistrict.get(v.patient_id), (a) => {
      a.vaccinesDue++;
      if (v.status === "Completed") a.vaccinesGiven++;
    });
  }

  for (const s of stock) touch(pharmacyDistrict.get(s.pharmacy_id), (a) => a.stockedMedicines.add(s.medicine_id));

  for (const f of feedback) {
    if (f.hospital_id === null || f.rating === null) continue;
    const rating = f.rating;
    touch(hospitalDistrict.get(f.hospital_id), (a) => a.ratings.push(rating));
  }

  for (const t of triages) {
    touch(patientDistrict.get(t.patient_id), (a) => {
      a.triages++;
      if (t.urgency_level === "Emergency") a.emergencyTriages++;
      if (t.channel && t.channel !== "Web") a.phoneChannelTriages++;
    });
  }

  const districtIndexes = districts.map((d) =>
    buildIndex(
      accs.get(String(d.district_id)) ?? newAcc(),
      {
        districtId: d.district_id,
        districtName: d.district_name,
        stateName: (d.states as { state_name?: string } | null)?.state_name ?? null,
      },
      catalogCount
    )
  );
  const unassigned = accs.get(UNASSIGNED);
  if (unassigned) {
    districtIndexes.push(
      buildIndex(unassigned, { districtId: null, districtName: "Location not recorded", stateName: null }, catalogCount)
    );
  }
  districtIndexes.sort((a, b) => (b.composite ?? -1) - (a.composite ?? -1));

  return {
    generatedAt: now.toISOString(),
    windowDays: HEALTH_INDEX_WINDOW_DAYS,
    minCellSize: MIN_CELL_SIZE,
    overall: buildIndex(overall, { districtId: null, districtName: "All districts", stateName: null }, catalogCount),
    districts: districtIndexes,
  };
}

// --- Public, de-identified view ------------------------------------------

export type PublicDistrictIndex = {
  districtId: number | null;
  districtName: string;
  stateName: string | null;
  composite: number | null;
  grade: HealthGrade;
  indicators: { key: IndicatorKey; label: string; score: number | null; suppressed: boolean }[];
  context: {
    patients: number | null;
    triages: number | null;
    emergencyTriageShare: number | null;
    phoneChannelTriageShare: number | null;
    remoteConsultShare: number | null;
  };
};

function toPublicDistrict(d: DistrictIndex): PublicDistrictIndex {
  const count = (n: number) => (n >= MIN_CELL_SIZE ? n : null);
  return {
    districtId: d.districtId,
    districtName: d.districtName,
    stateName: d.stateName,
    composite: d.composite,
    grade: d.grade,
    indicators: d.indicators.map((i) => {
      const suppressed = i.sampleSize < MIN_CELL_SIZE;
      return { key: i.key, label: i.label, score: suppressed ? null : i.score, suppressed };
    }),
    context: {
      patients: count(d.context.patients),
      triages: count(d.context.triages),
      emergencyTriageShare: d.context.triages >= MIN_CELL_SIZE ? d.context.emergencyTriageShare : null,
      phoneChannelTriageShare: d.context.triages >= MIN_CELL_SIZE ? d.context.phoneChannelTriageShare : null,
      remoteConsultShare: d.context.appointments >= MIN_CELL_SIZE ? d.context.remoteConsultShare : null,
    },
  };
}

export function toPublicReport(report: HealthIndexReport) {
  return {
    generatedAt: report.generatedAt,
    windowDays: report.windowDays,
    methodology:
      "Composite 0-100 = mean of indicator scores with at least minCellSize records. Cells built from fewer records are suppressed. Aggregated platform data only; no patient-level information.",
    minCellSize: report.minCellSize,
    indicators: INDICATOR_META,
    overall: toPublicDistrict(report.overall),
    districts: report.districts.map(toPublicDistrict),
  };
}
