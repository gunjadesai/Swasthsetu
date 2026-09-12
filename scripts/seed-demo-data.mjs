// One-shot demo-data seeder for local/demo Supabase projects.
//
// Creates a small, realistic set of accounts and records so a fresh
// project doesn't show empty dashboards during a demo: one doctor with
// a weekly availability block, one patient with a mix of scheduled and
// completed appointments, and one ASHA worker with a couple of
// registered patients and logged field visits.
//
// Uses the service-role key (server-only, never exposed to the
// browser) to create real auth.users rows via admin.createUser, the
// same pattern app/asha/(app)/patients/register/actions.ts uses for
// ASHA-assisted patient registration - so this exercises the same
// code path the app itself relies on, not a shortcut around it.
//
// Requires SUPABASE_SERVICE_ROLE_KEY in .env.local (already required
// by the app itself - see progress.md). Safe to re-run: every demo
// account uses a fixed, clearly-labelled email so a second run just
// reports "already exists" instead of duplicating data.
//
// Usage: node scripts/seed-demo-data.mjs

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  const path = join(__dirname, "..", ".env.local");
  const lines = readFileSync(path, "utf8").split("\n");
  const env = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

const env = loadEnvLocal();
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_PASSWORD = "DemoPass123!";

async function getOrCreateUser(email, fullName) {
  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (!createErr) return created.user;

  // Already exists from a previous run - look it up instead.
  if (createErr.message?.includes("already been registered") || createErr.status === 422) {
    const { data: list, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (listErr) throw listErr;
    const existing = list.users.find((u) => u.email === email);
    if (existing) return existing;
  }
  throw createErr;
}

async function upsertProfile({ id, fullName, phone, roleId, villageId }) {
  // profiles.id is the primary key (references auth.users), so this one
  // genuinely supports onConflict - unlike the domain tables below.
  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        id,
        full_name: fullName,
        phone_number: phone,
        role_id: roleId,
        village_id: villageId ?? null,
      },
      { onConflict: "id" }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

// doctors/patients/asha_workers all have a plain (non-unique) profile_id
// foreign key, not a unique constraint - so .upsert(..., {onConflict:
// "profile_id"}) silently fails with a Postgrest error. Do an explicit
// find-or-create instead.
async function findOrInsert(table, matchColumn, matchValue, insertRow) {
  const { data: existing, error: selectErr } = await supabase
    .from(table)
    .select("*")
    .eq(matchColumn, matchValue)
    .maybeSingle();
  if (selectErr) throw selectErr;
  if (existing) return existing;

  const { data: inserted, error: insertErr } = await supabase
    .from(table)
    .insert(insertRow)
    .select()
    .single();
  if (insertErr) throw insertErr;
  return inserted;
}

async function main() {
  console.log(`Seeding demo data into ${SUPABASE_URL} ...\n`);

  const { data: roles } = await supabase.from("roles").select("role_id, role_name");
  const roleId = Object.fromEntries(roles.map((r) => [r.role_name, r.role_id]));

  const { data: villages } = await supabase.from("villages").select("village_id, village_name").limit(2);
  const { data: hospitals } = await supabase.from("hospitals").select("hospital_id, name").limit(1);
  if (!villages?.length || !hospitals?.length) {
    console.error("No seed villages/hospitals found - run supabase/migrations/002_phase2_to_6.sql first.");
    process.exit(1);
  }
  const village = villages[0];
  const hospital = hospitals[0];

  // --- Doctor ---------------------------------------------------------
  console.log("Doctor: Meera Kulkarni (demo.doctor@swasthsetu.local)");
  const doctorUser = await getOrCreateUser("demo.doctor@swasthsetu.local", "Meera Kulkarni");
  await upsertProfile({
    id: doctorUser.id,
    fullName: "Meera Kulkarni",
    phone: "9800000001",
    roleId: roleId.Doctor,
  });
  const doctorRow = await findOrInsert("doctors", "profile_id", doctorUser.id, {
    profile_id: doctorUser.id,
    specialization: "General Medicine",
    registration_number: "MH-DEMO-0001",
    primary_hospital_id: hospital.hospital_id,
    supports_teleconsult: true,
  });

  const { data: existingAvailability } = await supabase
    .from("doctor_availability")
    .select("availability_id")
    .eq("doctor_id", doctorRow.doctor_id)
    .limit(1);
  if (!existingAvailability?.length) {
    const { error } = await supabase.from("doctor_availability").insert([
      { doctor_id: doctorRow.doctor_id, hospital_id: hospital.hospital_id, day_of_week: 1, start_time: "09:00", end_time: "13:00", slot_duration_minutes: 15, is_teleconsult_slot: false },
      { doctor_id: doctorRow.doctor_id, hospital_id: hospital.hospital_id, day_of_week: 3, start_time: "09:00", end_time: "13:00", slot_duration_minutes: 15, is_teleconsult_slot: false },
      { doctor_id: doctorRow.doctor_id, hospital_id: hospital.hospital_id, day_of_week: 5, start_time: "14:00", end_time: "17:00", slot_duration_minutes: 20, is_teleconsult_slot: true },
    ]);
    if (error) throw error;
    console.log("  added weekly availability (Mon/Wed/Fri)");
  }

  // --- Patient ---------------------------------------------------------
  console.log("Patient: Ramesh Pawar (demo.patient@swasthsetu.local)");
  const patientUser = await getOrCreateUser("demo.patient@swasthsetu.local", "Ramesh Pawar");
  await upsertProfile({
    id: patientUser.id,
    fullName: "Ramesh Pawar",
    phone: "9800000002",
    roleId: roleId.Patient,
    villageId: village.village_id,
  });
  const patientRow = await findOrInsert("patients", "profile_id", patientUser.id, {
    profile_id: patientUser.id,
    date_of_birth: "1985-04-12",
    gender: "Male",
    blood_group: "B+",
  });

  const { data: existingAppts } = await supabase
    .from("appointments")
    .select("appointment_id")
    .eq("patient_id", patientRow.patient_id)
    .limit(1);
  if (!existingAppts?.length) {
    const today = new Date();
    const fmt = (d) => d.toISOString().slice(0, 10);
    const past = new Date(today);
    past.setDate(past.getDate() - 10);
    const future = new Date(today);
    future.setDate(future.getDate() + 5);

    const { error } = await supabase.from("appointments").insert([
      {
        patient_id: patientRow.patient_id,
        doctor_id: doctorRow.doctor_id,
        hospital_id: hospital.hospital_id,
        appointment_date: fmt(past),
        appointment_time: "10:00",
        mode: "InPerson",
        status: "Completed",
        booked_by_profile_id: patientUser.id,
      },
      {
        patient_id: patientRow.patient_id,
        doctor_id: doctorRow.doctor_id,
        hospital_id: hospital.hospital_id,
        appointment_date: fmt(future),
        appointment_time: "09:15",
        mode: "Teleconsult",
        status: "Scheduled",
        booked_by_profile_id: patientUser.id,
      },
    ]);
    if (error) throw error;
    console.log("  added 1 completed + 1 upcoming appointment");
  }

  // --- ASHA worker -------------------------------------------------------
  console.log("ASHA worker: Sunita Bhoir (demo.asha@swasthsetu.local)");
  const ashaUser = await getOrCreateUser("demo.asha@swasthsetu.local", "Sunita Bhoir");
  await upsertProfile({
    id: ashaUser.id,
    fullName: "Sunita Bhoir",
    phone: "9800000003",
    roleId: roleId.ASHAWorker,
    villageId: village.village_id,
  });
  const ashaRow = await findOrInsert("asha_workers", "profile_id", ashaUser.id, {
    profile_id: ashaUser.id,
    assigned_village_id: village.village_id,
    asha_code: "MH-DEMO-A1",
    supervisor_phc_id: hospital.hospital_id,
  });

  const { data: existingAshaPatients } = await supabase
    .from("patients")
    .select("patient_id")
    .eq("registered_by_asha_id", ashaRow.asha_id)
    .limit(1);

  let ashaPatientIds = (existingAshaPatients ?? []).map((p) => p.patient_id);
  if (ashaPatientIds.length === 0) {
    const demoVillagers = [
      { name: "Kavita More", phone: "9800000004" },
      { name: "Ganesh Jadhav", phone: "9800000005" },
    ];
    for (const villager of demoVillagers) {
      const email = `${villager.phone}@asha.rural-health.local`;
      const user = await getOrCreateUser(email, villager.name);
      await upsertProfile({
        id: user.id,
        fullName: villager.name,
        phone: villager.phone,
        roleId: roleId.Patient,
        villageId: village.village_id,
      });
      const p = await findOrInsert("patients", "profile_id", user.id, {
        profile_id: user.id,
        registered_by_asha_id: ashaRow.asha_id,
        gender: "Other",
      });
      ashaPatientIds.push(p.patient_id);
    }
    console.log(`  registered ${demoVillagers.length} patients on this ASHA's behalf`);
  }

  const { data: existingVisits } = await supabase
    .from("asha_field_visits")
    .select("visit_id")
    .eq("asha_id", ashaRow.asha_id)
    .limit(1);
  if (!existingVisits?.length && ashaPatientIds.length > 0) {
    const today = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from("asha_field_visits").insert(
      ashaPatientIds.map((patientId, i) => ({
        asha_id: ashaRow.asha_id,
        patient_id: patientId,
        visit_date: today,
        purpose: i === 0 ? "Antenatal check" : "Routine follow-up",
        notes: "Demo data seeded for evaluation.",
        is_synced_from_offline: false,
      }))
    );
    if (error) throw error;
    console.log(`  logged ${ashaPatientIds.length} field visit(s)`);
  }

  console.log("\nDone. Demo accounts (password for all: " + DEMO_PASSWORD + "):");
  console.log("  Doctor:  demo.doctor@swasthsetu.local");
  console.log("  Patient: demo.patient@swasthsetu.local");
  console.log("  ASHA:    demo.asha@swasthsetu.local");
}

main().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
