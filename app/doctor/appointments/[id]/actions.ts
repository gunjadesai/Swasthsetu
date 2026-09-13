"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { encryptPHI } from "@/lib/phi-crypto";
import { isMissingSchemaError } from "@/lib/supabase/schema-fallback";

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
  referHospitalId: z.coerce.number().optional(),
  referReason: z.string().optional(),
  referUrgency: z.enum(["Normal", "Urgent", "Emergency"]).optional(),
  labId: z.coerce.number().optional(),
  labTestId: z.coerce.number().optional(),
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
    referHospitalId: formData.get("referHospitalId") || undefined,
    referReason: formData.get("referReason") || undefined,
    referUrgency: formData.get("referUrgency") || undefined,
    labId: formData.get("labId") || undefined,
    labTestId: formData.get("labTestId") || undefined,
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

  // Diagnosis, symptoms and notes are PHI - encrypted before storage.
  let clinical: { diagnosis: string | null; symptoms: string | null; notes: string | null };
  try {
    clinical = {
      diagnosis: encryptPHI(parsed.data.diagnosis),
      symptoms: encryptPHI(parsed.data.symptoms),
      notes: encryptPHI(parsed.data.notes),
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not secure the consultation record." };
  }

  // One round trip, one transaction (migration 005). The old version
  // wrote the record, prescription, referral, lab order and appointment
  // status as five independent calls, so a failure partway through left
  // a half-saved consultation - an orphan record with no prescription,
  // or a completed record on an appointment still marked Scheduled.
  // record_consultation() checks that this doctor owns the appointment,
  // so the ownership check that used to live here is gone with it.
  const { data: recordId, error } = await supabase.rpc("record_consultation", {
    p_appointment_id: parsed.data.appointmentId,
    p_diagnosis: clinical.diagnosis,
    p_symptoms: clinical.symptoms,
    p_notes: clinical.notes,
    p_items: items,
    p_refer_hospital_id: parsed.data.referHospitalId ?? null,
    p_refer_reason: parsed.data.referReason ?? null,
    p_refer_urgency: parsed.data.referUrgency ?? "Normal",
    p_lab_id: parsed.data.labId ?? null,
    p_test_id: parsed.data.labTestId ?? null,
  });

  if (error) {
    if (isMissingSchemaError(error)) {
      return {
        error:
          "Saving a consultation needs supabase/migrations/005_open_issue_fixes.sql - run it in the Supabase SQL Editor, then save again. Nothing has been recorded yet.",
      };
    }
    if (error.code === "42501") {
      return { error: "Appointment not found, or your account isn't verified yet." };
    }
    return { error: error.message };
  }
  if (!recordId) return { error: "Could not save the record." };

  revalidatePath(`/doctor/appointments/${parsed.data.appointmentId}`);
  revalidatePath("/doctor/appointments");
  revalidatePath("/doctor/dashboard");
  return {};
}
