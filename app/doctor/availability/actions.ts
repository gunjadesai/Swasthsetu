"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  dayOfWeek: z.coerce.number().min(0).max(6),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  slotDuration: z.coerce.number().min(5).max(180),
});

export type AvailabilityState = { error?: string };

export async function addAvailability(
  _prevState: AvailabilityState,
  formData: FormData
): Promise<AvailabilityState> {
  const parsed = schema.safeParse({
    dayOfWeek: formData.get("dayOfWeek"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    slotDuration: formData.get("slotDuration"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  if (parsed.data.endTime <= parsed.data.startTime) {
    return { error: "End time must be after start time." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: doctor } = await supabase
    .from("doctors")
    .select("doctor_id")
    .eq("profile_id", user!.id)
    .single();
  if (!doctor) return { error: "Doctor profile not found." };

  const { error } = await supabase.from("doctor_availability").insert({
    doctor_id: doctor.doctor_id,
    day_of_week: parsed.data.dayOfWeek,
    start_time: parsed.data.startTime,
    end_time: parsed.data.endTime,
    slot_duration_minutes: parsed.data.slotDuration,
  });

  if (error) return { error: error.message };

  revalidatePath("/doctor/availability");
  return {};
}

export async function deleteAvailability(availabilityId: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: doctor } = await supabase
    .from("doctors")
    .select("doctor_id")
    .eq("profile_id", user!.id)
    .single();
  if (!doctor) return { error: "Doctor profile not found." };

  const { error } = await supabase
    .from("doctor_availability")
    .delete()
    .eq("availability_id", availabilityId)
    .eq("doctor_id", doctor.doctor_id);

  if (error) return { error: error.message };
  revalidatePath("/doctor/availability");
  return { error: null };
}
