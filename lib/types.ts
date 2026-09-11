// Plain domain types for Phase 1 (Patient + Doctor). These are hand
// written to match supabase/schema.sql - they are a convenience for
// autocomplete in this codebase, not a source of truth. Once you can
// run `supabase gen types`, that generated file becomes the source of
// truth for the actual DB shape.

export type RoleName = "Patient" | "Doctor" | "Administrator";

export type Profile = {
  id: string;
  full_name: string;
  phone_number: string | null;
  role_id: number;
  avatar_url: string | null;
  avatar_cloudinary_public_id: string | null;
  created_at: string;
};

export type Doctor = {
  doctor_id: number;
  profile_id: string;
  specialization: string | null;
  registration_number: string | null;
  primary_hospital_id: number | null;
  supports_teleconsult: boolean;
};

export type Patient = {
  patient_id: number;
  profile_id: string;
  date_of_birth: string | null;
  gender: string | null;
  blood_group: string | null;
  address: string | null;
  emergency_contact: string | null;
  health_id_number: string | null;
};

export type AppointmentStatus =
  | "Scheduled"
  | "Completed"
  | "Cancelled"
  | "NoShow";

export type Appointment = {
  appointment_id: number;
  patient_id: number;
  doctor_id: number;
  appointment_date: string;
  appointment_time: string;
  mode: "InPerson" | "Teleconsult";
  status: AppointmentStatus;
  created_at: string;
};

export type DoctorAvailability = {
  availability_id: number;
  doctor_id: number;
  day_of_week: number; // 0=Sunday ... 6=Saturday
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
};

export type MedicalRecord = {
  record_id: number;
  patient_id: number;
  appointment_id: number | null;
  doctor_id: number;
  diagnosis: string | null;
  symptoms: string | null;
  notes: string | null;
  created_at: string;
};

export type Prescription = {
  prescription_id: number;
  record_id: number;
  doctor_id: number;
  patient_id: number;
  issued_date: string;
};

export type PrescriptionItem = {
  prescription_item_id: number;
  prescription_id: number;
  medicine_name: string;
  dosage: string | null;
  duration_days: number | null;
  instructions: string | null;
};
