import Link from "next/link";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { isMissingSchemaError } from "@/lib/supabase/schema-fallback";
import { cn } from "@/lib/utils";
import { VerificationList, type StaffRow } from "./verification-list";

export const dynamic = "force-dynamic";

const TABS = ["Pending", "Verified", "Rejected"] as const;
type Tab = (typeof TABS)[number];

const ROLE_LABEL: Record<string, string> = {
  Doctor: "Doctor",
  ASHAWorker: "ASHA Worker",
  HospitalStaff: "Hospital Staff",
  LabStaff: "Lab Staff",
  PharmacyStaff: "Pharmacy Staff",
  AmbulanceProvider: "Ambulance Provider",
};

type Named = { name?: string } | null;
type ProfileRow = {
  id: string;
  full_name: string;
  phone_number: string | null;
  created_at: string;
  verification_status: Tab;
  verification_note: string | null;
  verified_at: string | null;
  roles: { role_name: string } | null;
  doctors: { registration_number: string | null; specialization: string | null; hospitals: Named }[] | null;
  hospital_staff: { designation: string | null; hospitals: Named }[] | null;
  lab_staff: { laboratories: Named }[] | null;
  pharmacy_staff: { pharmacies: Named }[] | null;
  ambulances: { vehicle_number: string }[] | null;
  asha_workers: { asha_code: string | null; villages: { village_name?: string } | null }[] | null;
};

// Embedded one-to-many relations come back as arrays.
function first<T>(value: T[] | T | null | undefined): T | undefined {
  return Array.isArray(value) ? value[0] : (value ?? undefined);
}

// What an administrator needs to check before approving.
function facilityOf(row: ProfileRow): string {
  const doctor = first(row.doctors);
  if (doctor) {
    return [
      `Registration no. ${doctor.registration_number ?? "not provided yet"}`,
      doctor.specialization,
      doctor.hospitals?.name,
    ]
      .filter(Boolean)
      .join(" · ");
  }
  const hospitalStaff = first(row.hospital_staff);
  if (hospitalStaff) return [hospitalStaff.hospitals?.name, hospitalStaff.designation].filter(Boolean).join(" · ");
  const lab = first(row.lab_staff);
  if (lab) return lab.laboratories?.name ?? "Lab not selected";
  const pharmacy = first(row.pharmacy_staff);
  if (pharmacy) return pharmacy.pharmacies?.name ?? "Pharmacy not selected";
  const ambulance = first(row.ambulances);
  if (ambulance) return `Vehicle ${ambulance.vehicle_number}`;
  const asha = first(row.asha_workers);
  if (asha) return [`ASHA code ${asha.asha_code ?? "not provided"}`, asha.villages?.village_name].filter(Boolean).join(" · ");
  return "Onboarding not completed yet";
}

export default async function AdminVerificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const tab: Tab = (TABS as readonly string[]).includes(status ?? "") ? (status as Tab) : "Pending";

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, full_name, phone_number, created_at, verification_status, verification_note, verified_at, roles!inner(role_name), doctors(registration_number, specialization, hospitals(name)), hospital_staff(designation, hospitals(name)), lab_staff(laboratories(name)), pharmacy_staff(pharmacies(name)), ambulances(vehicle_number), asha_workers(asha_code, villages(village_name))"
    )
    .eq("verification_status", tab)
    .not("roles.role_name", "in", "(Patient,Administrator)")
    .order("created_at", { ascending: tab === "Pending" });

  const rows: StaffRow[] = ((data ?? []) as unknown as ProfileRow[]).map((row) => ({
    id: row.id,
    fullName: row.full_name,
    phone: row.phone_number,
    role: ROLE_LABEL[row.roles?.role_name ?? ""] ?? row.roles?.role_name ?? "Staff",
    facility: facilityOf(row),
    signedUp: format(new Date(row.created_at), "d MMM yyyy"),
    status: row.verification_status,
    note: row.verification_note,
    decidedAt: row.verified_at ? format(new Date(row.verified_at), "d MMM yyyy") : null,
  }));

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold text-ink">Staff verification</h1>
      <p className="mt-1 text-sm text-ink/70">
        New doctor, ASHA, hospital, lab, pharmacy and ambulance accounts can&apos;t see any patient
        information until you approve them. Check their registration number or facility first.
      </p>

      <div className="mt-4 flex gap-1 border-b border-line">
        {TABS.map((t) => (
          <Link
            key={t}
            href={t === "Pending" ? "/admin/verifications" : `/admin/verifications?status=${t}`}
            className={cn(
              "px-3 py-2 text-sm font-medium",
              tab === t ? "border-b-2 border-teal-600 text-teal-700" : "text-ink/70 hover:text-ink"
            )}
          >
            {t}
          </Link>
        ))}
      </div>

      <div className="mt-6">
        {error ? (
          <Card>
            <p className="text-sm text-danger">
              {isMissingSchemaError(error)
                ? "Staff verification isn't enabled in the database yet - run supabase/migrations/004_high_priority_fixes.sql in the Supabase SQL Editor."
                : error.message}
            </p>
          </Card>
        ) : (
          <VerificationList rows={rows} />
        )}
      </div>
    </div>
  );
}
