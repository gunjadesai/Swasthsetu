"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(m: number): string {
  const h = Math.floor(m / 60)
    .toString()
    .padStart(2, "0");
  const min = (m % 60).toString().padStart(2, "0");
  return `${h}:${min}`;
}

// Reads the doctor's weekly availability template, subtracts slots
// that already have a Scheduled appointment on that exact date, and -
// if the date is today - drops slots that have already passed.
export async function getAvailableSlots(
  doctorId: number,
  dateStr: string
): Promise<string[]> {
  if (!doctorId || !dateStr) return [];

  const supabase = await createClient();
  const dayOfWeek = new Date(`${dateStr}T00:00:00`).getDay();

  const { data: availability } = await supabase
    .from("doctor_availability")
    .select("start_time, end_time, slot_duration_minutes")
    .eq("doctor_id", doctorId)
    .eq("day_of_week", dayOfWeek);

  if (!availability || availability.length === 0) return [];

  const { data: booked } = await supabase
    .from("appointments")
    .select("appointment_time")
    .eq("doctor_id", doctorId)
    .eq("appointment_date", dateStr)
    .eq("status", "Scheduled");

  const bookedTimes = new Set((booked ?? []).map((b) => b.appointment_time.slice(0, 5)));

  const todayStr = new Date().toISOString().slice(0, 10);
  const nowMinutes =
    dateStr === todayStr
      ? new Date().getHours() * 60 + new Date().getMinutes()
      : -1;

  const slots = new Set<string>();
  for (const block of availability) {
    let cursor = timeToMinutes(block.start_time);
    const end = timeToMinutes(block.end_time);
    while (cursor + block.slot_duration_minutes <= end) {
      const slot = minutesToTime(cursor);
      if (!bookedTimes.has(slot) && cursor > nowMinutes) {
        slots.add(slot);
      }
      cursor += block.slot_duration_minutes;
    }
  }
  return Array.from(slots).sort();
}

export type BookState = { error?: string };

export async function bookAppointment(
  _prevState: BookState,
  formData: FormData
): Promise<BookState> {
  const doctorId = Number(formData.get("doctorId"));
  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "");
  const mode = String(formData.get("mode") ?? "InPerson") as
    | "InPerson"
    | "Teleconsult";

  if (!doctorId || !date || !time) {
    return { error: "Pick a doctor, a date, and an open time slot." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: patient } = await supabase
    .from("patients")
    .select("patient_id")
    .eq("profile_id", user!.id)
    .single();

  if (!patient) {
    return { error: "Patient profile not found." };
  }

  const { error } = await supabase.from("appointments").insert({
    patient_id: patient.patient_id,
    doctor_id: doctorId,
    appointment_date: date,
    appointment_time: time,
    mode,
    booked_by_profile_id: user!.id,
  });

  if (error) {
    // A duplicate/unique-slot race is the most likely real failure
    // here - someone else may have just taken this slot.
    return { error: error.message };
  }

  redirect("/patient/appointments");
}
