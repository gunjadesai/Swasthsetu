"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { consultModeLabel, isConsultMode, isRemoteConsult } from "@/lib/consult-mode";
import { telecomTexts } from "@/lib/telecom/messages";
import { sendSms } from "@/lib/telecom/sms";

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
  const modeValue = formData.get("mode");
  const mode = isConsultMode(modeValue) ? modeValue : "InPerson";

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

  const { data: doctor } = await supabase
    .from("doctors")
    .select("supports_teleconsult, profiles(full_name)")
    .eq("doctor_id", doctorId)
    .single();

  if (isRemoteConsult(mode) && !doctor?.supports_teleconsult) {
    return { error: "This doctor doesn't offer voice or video consultations - choose In person or another doctor." };
  }

  const { data: appointment, error } = await supabase
    .from("appointments")
    .insert({
      patient_id: patient.patient_id,
      doctor_id: doctorId,
      appointment_date: date,
      appointment_time: time,
      mode,
      booked_by_profile_id: user!.id,
    })
    .select("appointment_id")
    .single();

  if (error || !appointment) {
    // The old CHECK constraint only allows InPerson/Teleconsult.
    if (error?.code === "23514" && mode === "VoiceConsult") {
      return {
        error:
          "Voice consults aren't enabled in the database yet - run supabase/migrations/003_ai_triage_voice_sms_phi.sql, or book a video consult for now.",
      };
    }
    // A duplicate/unique-slot race is the most likely real failure
    // here - someone else may have just taken this slot.
    return { error: error?.message ?? "Could not book this slot." };
  }

  // SMS confirmation, so the booking reaches patients who only carry a
  // keypad phone. Sent after the redirect; never blocks the booking.
  const { data: profile } = await supabase
    .from("profiles")
    .select("phone_number")
    .eq("id", user!.id)
    .single();
  if (profile?.phone_number) {
    const locale = await getLocale();
    const doctorName =
      (doctor?.profiles as unknown as { full_name?: string } | null)?.full_name ?? "";
    const text = telecomTexts(locale).bookingConfirmed(
      doctorName,
      format(new Date(`${date}T${time}`), "d MMM, HH:mm"),
      consultModeLabel(mode)
    );
    const phone = profile.phone_number;
    after(async () => {
      await sendSms(phone, text, {
        profileId: user!.id,
        relatedTable: "appointments",
        relatedId: appointment.appointment_id,
      });
    });
  }

  redirect("/patient/appointments");
}
