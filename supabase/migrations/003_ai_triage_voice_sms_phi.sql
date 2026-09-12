-- =====================================================================
-- SWASTHSETU - Migration 003
-- AI triage, voice emergency + voice consult, SMS/USSD/IVR for keypad
-- phones, PHI encryption support, Public Health Index
-- =====================================================================
-- Additive only. Assumes schema.sql and 002_phase2_to_6.sql are live.
-- Safe to paste more than once.
--
-- HOW TO RUN: Supabase dashboard -> SQL Editor -> paste this whole file
-- -> Run.

-- ---------------------------------------------------------------------
-- 1. VOICE CONSULTATION (audio-only teleconsult)
-- ---------------------------------------------------------------------
-- Appointments can now be InPerson, Teleconsult (video) or VoiceConsult
-- (audio-only - works on 2G/weak 3G, and the doctor can fall back to a
-- normal phone call for patients on keypad phones).
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_mode_check;
ALTER TABLE appointments ADD CONSTRAINT appointments_mode_check
    CHECK (mode IN ('InPerson','Teleconsult','VoiceConsult'));

ALTER TABLE teleconsult_sessions ADD COLUMN IF NOT EXISTS call_type VARCHAR(10) NOT NULL DEFAULT 'Video'
    CHECK (call_type IN ('Video','Voice','Phone'));

-- teleconsult_sessions had RLS enabled with no policy in schema.sql, so
-- the room could never actually be created from a user session. Only
-- the two participants of the appointment may see/create/update it.
DROP POLICY IF EXISTS "teleconsult_select_participants" ON teleconsult_sessions;
CREATE POLICY "teleconsult_select_participants" ON teleconsult_sessions
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM appointments a
        WHERE a.appointment_id = teleconsult_sessions.appointment_id
          AND (a.patient_id = current_patient_id() OR a.doctor_id = current_doctor_id())
    ));
DROP POLICY IF EXISTS "teleconsult_insert_participants" ON teleconsult_sessions;
CREATE POLICY "teleconsult_insert_participants" ON teleconsult_sessions
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM appointments a
        WHERE a.appointment_id = teleconsult_sessions.appointment_id
          AND (a.patient_id = current_patient_id() OR a.doctor_id = current_doctor_id())
    ));
DROP POLICY IF EXISTS "teleconsult_update_participants" ON teleconsult_sessions;
CREATE POLICY "teleconsult_update_participants" ON teleconsult_sessions
    FOR UPDATE TO authenticated
    USING (EXISTS (
        SELECT 1 FROM appointments a
        WHERE a.appointment_id = teleconsult_sessions.appointment_id
          AND (a.patient_id = current_patient_id() OR a.doctor_id = current_doctor_id())
    ));

-- ---------------------------------------------------------------------
-- 2. AI TRIAGE + MULTI-CHANNEL INTAKE
-- ---------------------------------------------------------------------
-- engine: which model produced the final result. 'AI+Rules' means the
-- AI result was escalated by a rule-based red flag (rules can only ever
-- raise urgency, never lower it).
-- free_text / ai_assessment are PHI-encrypted by the app (lib/phi-crypto.ts).
ALTER TABLE triage_assessments ADD COLUMN IF NOT EXISTS channel VARCHAR(10) NOT NULL DEFAULT 'Web'
    CHECK (channel IN ('Web','Voice','SMS','USSD','IVR'));
ALTER TABLE triage_assessments ADD COLUMN IF NOT EXISTS engine VARCHAR(20) NOT NULL DEFAULT 'Rules'
    CHECK (engine IN ('Rules','AI','AI+Rules'));
ALTER TABLE triage_assessments ADD COLUMN IF NOT EXISTS free_text TEXT;
ALTER TABLE triage_assessments ADD COLUMN IF NOT EXISTS ai_assessment TEXT;

ALTER TABLE ambulance_requests ADD COLUMN IF NOT EXISTS channel VARCHAR(10) NOT NULL DEFAULT 'Web'
    CHECK (channel IN ('Web','Voice','SMS','USSD','IVR'));
ALTER TABLE ambulance_requests ADD COLUMN IF NOT EXISTS caller_notes TEXT;
ALTER TABLE ambulance_requests ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMPTZ;

-- An ambulance request may only name a patient the requester is allowed
-- to act for: themselves, or (for an ASHA) a patient they registered.
DROP POLICY IF EXISTS "ambulance_requests_insert_own" ON ambulance_requests;
CREATE POLICY "ambulance_requests_insert_own" ON ambulance_requests
    FOR INSERT TO authenticated
    WITH CHECK (
        requested_by_profile_id = auth.uid()
        AND (
            patient_id IS NULL
            OR patient_id = current_patient_id()
            OR EXISTS (
                SELECT 1 FROM patients p
                WHERE p.patient_id = ambulance_requests.patient_id
                  AND p.registered_by_asha_id = current_asha_id()
            )
        )
    );

-- ---------------------------------------------------------------------
-- 3. PHI ENCRYPTION - widen columns that now hold AES-256-GCM ciphertext
-- ---------------------------------------------------------------------
-- Ciphertext is base64 + IV + auth tag, so it is longer than the
-- plaintext; VARCHAR limits would truncate it. Existing plaintext rows
-- keep working - the app decrypts only values with the enc:v1: prefix.
ALTER TABLE medical_records ALTER COLUMN diagnosis TYPE TEXT;
ALTER TABLE medical_records ALTER COLUMN symptoms  TYPE TEXT;
ALTER TABLE patients        ALTER COLUMN address           TYPE TEXT;
ALTER TABLE patients        ALTER COLUMN emergency_contact TYPE TEXT;

-- PHI access audit trail: users can write their own access events,
-- only administrators can read the log.
DROP POLICY IF EXISTS "audit_insert_own" ON audit_logs;
CREATE POLICY "audit_insert_own" ON audit_logs
    FOR INSERT TO authenticated WITH CHECK (profile_id = auth.uid());
DROP POLICY IF EXISTS "audit_select_admin" ON audit_logs;
CREATE POLICY "audit_select_admin" ON audit_logs
    FOR SELECT TO authenticated USING (is_admin());
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_name, entity_id, created_at);

-- ---------------------------------------------------------------------
-- 4. SMS / USSD / IVR (keypad phones)
-- ---------------------------------------------------------------------
-- Match an inbound phone number to a profile regardless of how it was
-- typed at signup ("+91 98765-43210" vs "9876543210").
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_last10 TEXT
    GENERATED ALWAYS AS (right(regexp_replace(coalesce(phone_number, ''), '\D', '', 'g'), 10)) STORED;
CREATE INDEX IF NOT EXISTS idx_profiles_phone_last10 ON profiles(phone_last10);

-- Every inbound/outbound telecom message. body is PHI-encrypted by the
-- app. Written only by the service-role client from the webhook routes;
-- readable by the person it belongs to and by administrators.
CREATE TABLE IF NOT EXISTS sms_messages (
    message_id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    direction           VARCHAR(10) NOT NULL CHECK (direction IN ('Inbound','Outbound')),
    channel             VARCHAR(10) NOT NULL DEFAULT 'SMS' CHECK (channel IN ('SMS','USSD','IVR')),
    phone_number        VARCHAR(20) NOT NULL,
    profile_id          UUID REFERENCES profiles(id) ON DELETE SET NULL,
    body                TEXT NOT NULL,
    provider            VARCHAR(20),
    provider_message_id VARCHAR(100),
    status              VARCHAR(20) NOT NULL DEFAULT 'Received'
        CHECK (status IN ('Received','Sent','Simulated','Failed')),
    error               TEXT,
    related_table       VARCHAR(50),
    related_id          TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sms_select_own_or_admin" ON sms_messages;
CREATE POLICY "sms_select_own_or_admin" ON sms_messages
    FOR SELECT TO authenticated USING (profile_id = auth.uid() OR is_admin());
CREATE INDEX IF NOT EXISTS idx_sms_messages_phone ON sms_messages(phone_number, created_at);

ALTER TABLE reminders ADD COLUMN IF NOT EXISTS last_error TEXT;
ALTER TABLE reminders ADD COLUMN IF NOT EXISTS provider_message_id VARCHAR(100);

-- ---------------------------------------------------------------------
-- 5. Seed: Gujarati (the UI already ships a gu locale)
-- ---------------------------------------------------------------------
INSERT INTO languages (language_name, language_code) VALUES ('Gujarati', 'gu')
ON CONFLICT (language_code) DO NOTHING;
