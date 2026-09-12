// Plain domain types for Phase 1 (Patient + Doctor). These are hand
// written to match supabase/schema.sql - they are a convenience for
// autocomplete in this codebase, not a source of truth. Once you can
// run `supabase gen types`, that generated file becomes the source of
// truth for the actual DB shape.

export type RoleName =
  | "Patient"
  | "ASHAWorker"
  | "Doctor"
  | "HospitalStaff"
  | "LabStaff"
  | "PharmacyStaff"
  | "AmbulanceProvider"
  | "Administrator";

// Roles a person can pick for themselves on the signup form.
// Administrator is deliberately excluded - promoted manually via SQL,
// see supabase/migrations/002_phase2_to_6.sql section 9.
export type SelfServeRoleName = Exclude<RoleName, "Administrator">;

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

// address and emergency_contact are PHI-encrypted at rest (migration 003).
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
  mode: "InPerson" | "Teleconsult" | "VoiceConsult";
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

// diagnosis, symptoms and notes are PHI-encrypted at rest (migration 003).
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

// --- Phase 2-6 types --------------------------------------------------

export type UrgencyLevel = "Low" | "Medium" | "High" | "Emergency";

export type RecommendedAction =
  | "SelfCare"
  | "BookAppointment"
  | "VisitPHC"
  | "Teleconsult"
  | "CallAmbulance";

// Where a triage / ambulance request came from (migration 003).
export type TriageChannel = "Web" | "Voice" | "SMS" | "USSD" | "IVR";

// Which engine produced the final triage result. "AI+Rules" = the AI's
// urgency was raised by a rule-based red flag.
export type TriageEngine = "Rules" | "AI" | "AI+Rules";

export type TriageAssessment = {
  triage_id: number;
  patient_id: number;
  conducted_by_profile_id: string;
  symptoms: Record<string, unknown>;
  urgency_level: UrgencyLevel;
  recommended_action: RecommendedAction;
  notes: string | null;
  linked_appointment_id: number | null;
  linked_ambulance_request_id: number | null;
  channel: TriageChannel;
  engine: TriageEngine;
  free_text: string | null; // PHI-encrypted
  ai_assessment: string | null; // PHI-encrypted JSON
  created_at: string;
};

export type QueueTicketStatus =
  | "Waiting"
  | "Called"
  | "InConsult"
  | "Done"
  | "Skipped"
  | "Cancelled";

export type QueueTicket = {
  ticket_id: number;
  hospital_id: number;
  patient_id: number;
  doctor_id: number | null;
  triage_id: number | null;
  queue_date: string;
  token_number: number;
  priority: "Normal" | "Priority" | "Emergency";
  status: QueueTicketStatus;
  checked_in_at: string;
  called_at: string | null;
  completed_at: string | null;
};

export type AshaWorker = {
  asha_id: number;
  profile_id: string;
  assigned_village_id: number;
  asha_code: string | null;
  supervisor_phc_id: number | null;
};

export type AshaFieldVisit = {
  visit_id: number;
  asha_id: number;
  patient_id: number;
  visit_date: string;
  purpose: string | null;
  notes: string | null;
  is_synced_from_offline: boolean;
};

export type Referral = {
  referral_id: number;
  patient_id: number;
  referred_from_hospital_id: number | null;
  referred_to_hospital_id: number;
  referred_by_doctor_id: number | null;
  reason: string | null;
  urgency_level: "Normal" | "Urgent" | "Emergency";
  status: "Pending" | "Accepted" | "Completed" | "Cancelled";
  triage_id: number | null;
  created_at: string;
};

export type AmbulanceRequestStatus =
  | "Requested"
  | "Dispatched"
  | "Completed"
  | "Cancelled";

export type AmbulanceRequest = {
  request_id: number;
  patient_id: number | null;
  requested_by_profile_id: string;
  ambulance_id: number | null;
  pickup_latitude: number | null;
  pickup_longitude: number | null;
  destination_hospital_id: number | null;
  status: AmbulanceRequestStatus;
  triage_id: number | null;
  channel: TriageChannel;
  caller_notes: string | null; // PHI-encrypted
  requested_at: string;
  dispatched_at: string | null;
  completed_at: string | null;
};

export type HealthScheme = {
  scheme_id: number;
  scheme_name: string;
  description: string | null;
  eligibility_criteria: string | null;
  scheme_name_hi: string | null;
  description_hi: string | null;
  eligibility_criteria_hi: string | null;
  is_active: boolean;
};

export type Feedback = {
  feedback_id: number;
  profile_id: string;
  hospital_id: number | null;
  appointment_id: number | null;
  category: "General" | "Complaint" | "ServiceQuality";
  rating: number | null;
  comments: string | null;
  status: "Open" | "Reviewed" | "Resolved";
  created_at: string;
};

export type Reminder = {
  reminder_id: number;
  patient_id: number;
  reminder_type: "Vaccination" | "Medicine" | "Appointment" | "FollowUp";
  reference_id: number | null;
  message: string;
  scheduled_for: string;
  channel: "SMS" | "IVR" | "App";
  status: "Pending" | "Sent" | "Failed";
  last_error: string | null;
  provider_message_id: string | null;
};

export type SmsMessage = {
  message_id: number;
  direction: "Inbound" | "Outbound";
  channel: "SMS" | "USSD" | "IVR";
  phone_number: string;
  profile_id: string | null;
  body: string; // PHI-encrypted
  provider: string | null;
  provider_message_id: string | null;
  status: "Received" | "Sent" | "Simulated" | "Failed";
  error: string | null;
  created_at: string;
};

export type LabTestOrder = {
  order_id: number;
  record_id: number;
  patient_id: number;
  lab_id: number;
  test_id: number;
  ordered_by_doctor_id: number;
  status: "Ordered" | "SampleCollected" | "ResultReady";
  result_summary: string | null;
  result_file_path: string | null;
};

export type MedicineAvailability = {
  availability_id: number;
  pharmacy_id: number;
  medicine_id: number;
  stock_quantity: number;
  last_updated: string;
};
