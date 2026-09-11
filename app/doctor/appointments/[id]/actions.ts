"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const itemSchema = z.object({
  medicineName: z.string().min(1),
  dosage: z.string().optional(),
  durationDays: z.coerce.number().optional(),
  instructions: z.string().optional(),
});

const schema = z.object({
  appointmentId: z.coerce.number(),
  diagnosis: z.string().optional(),
  symptoms: z.string().optional(),
  notes: z.string().optional(),
  itemsJson: z.string().optional(),
});

export type CompleteState = { error?: string };

export async function completeConsult(
  _prevState: CompleteState,
  formData: FormData
): Promise<CompleteState> {
  const parsed = schema.safeParse({
    appointmentId: formData.get("appointmentId"),
    diagnosis: formData.get("diagnosis") || undefined,
    symptoms: formData.get("symptoms") || undefined,
    notes: formData.get("notes") || undefined,
    itemsJson: formData.get("itemsJson") || undefined,
  });

  if (!parsed.success) return { error: "Please check the form." };

  let items: Array<{
    medicineName: string;
    dosage?: string;
    durationDays?: number;
    instructions?: string;
  }> = [];

  if (parsed.data.itemsJson) {
    try {
      const raw = JSON.parse(parsed.data.itemsJson);
      items = z.array(itemSchema).parse(raw);
    } catch {
      return { error: "Prescription items are invalid." };
    }
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

  const { data: appointment } = await supabase
    .from("appointments")
    .select("appointment_id, patient_id, doctor_id, status")
    .eq("appointment_id", parsed.data.appointmentId)
    .single();

  if (!appointment || appointment.doctor_id !== doctor.doctor_id) {
    return { error: "Appointment not found." };
  }

  const { data: record, error: recordError } = await supabase
    .from("medical_records")
    .insert({
      patient_id: appointment.patient_id,
      appointment_id: appointment.appointment_id,
      doctor_id: doctor.doctor_id,
      diagnosis: parsed.data.diagnosis ?? null,
      symptoms: parsed.data.symptoms ?? null,
      notes: parsed.data.notes ?? null,
    })
    .select("record_id")
    .single();

  if (recordError || !record) {
    return { error: recordError?.message ?? "Could not save the record." };
  }

  if (items.length > 0) {
    const { data: prescription, error: prescriptionError } = await supabase
      .from("prescriptions")
      .insert({
        record_id: record.record_id,
        doctor_id: doctor.doctor_id,
        patient_id: appointment.patient_id,
      })
      .select("prescription_id")
      .single();

    if (prescriptionError || !prescription) {
      return {
        error: prescriptionError?.message ?? "Could not save the prescription.",
      };
    }

    const { error: itemsError } = await supabase.from("prescription_items").insert(
      items.map((item) => ({
        prescription_id: prescription.prescription_id,
        medicine_name: item.medicineName,
        dosage: item.dosage ?? null,
        duration_days: item.durationDays ?? null,
        instructions: item.instructions ?? null,
      }))
    );
    if (itemsError) return { error: itemsError.message };
  }

  const { error: statusError } = await supabase
    .from("appointments")
    .update({ status: "Completed" })
    .eq("appointment_id", appointment.appointment_id);

  if (statusError) return { error: statusError.message };

  revalidatePath(`/doctor/appointments/${appointment.appointment_id}`);
  revalidatePath("/doctor/appointments");
  revalidatePath("/doctor/dashboard");
  return {};
}
