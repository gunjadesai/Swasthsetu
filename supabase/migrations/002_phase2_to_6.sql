-- =====================================================================
-- RURAL HEALTHCARE ACCESSIBILITY PLATFORM
-- Migration 002: Phases 2-6 (ASHA, triage/queue, referrals, ambulance,
-- lab, pharmacy, admin/reminders/schemes/feedback, i18n seed data)
-- =====================================================================
-- Additive only. Assumes supabase/schema.sql (Phase 1) is already live.
-- Safe to paste more than once (CREATE TABLE IF NOT EXISTS, ADD COLUMN
-- IF NOT EXISTS, and DROP POLICY IF EXISTS + CREATE POLICY throughout).
--
-- HOW TO RUN: Supabase dashboard -> SQL Editor -> paste this whole file
-- -> Run. Does NOT touch or re-run supabase/schema.sql.

-- ---------------------------------------------------------------------
-- 1. NEW TABLES
-- ---------------------------------------------------------------------

-- Digital triage: patient self-triage or ASHA-assisted triage, routes
-- to the right next action.
CREATE TABLE IF NOT EXISTS triage_assessments (
    triage_id                    INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    patient_id                   INT NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
    conducted_by_profile_id      UUID NOT NULL REFERENCES profiles(id),
    symptoms                     JSONB NOT NULL,
    urgency_level                VARCHAR(20) NOT NULL
        CHECK (urgency_level IN ('Low','Medium','High','Emergency')),
    recommended_action           VARCHAR(30) NOT NULL
        CHECK (recommended_action IN ('SelfCare','BookAppointment','VisitPHC','Teleconsult','CallAmbulance')),
    notes                        TEXT,
    linked_appointment_id        INT REFERENCES appointments(appointment_id) ON DELETE SET NULL,
    linked_ambulance_request_id  INT,
    created_at                   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Walk-in / same-day queue at a hospital (token system).
CREATE TABLE IF NOT EXISTS queue_tickets (
    ticket_id       INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    hospital_id     INT NOT NULL REFERENCES hospitals(hospital_id),
    patient_id      INT NOT NULL REFERENCES patients(patient_id),
    doctor_id       INT REFERENCES doctors(doctor_id),
    triage_id       INT REFERENCES triage_assessments(triage_id) ON DELETE SET NULL,
    queue_date      DATE NOT NULL DEFAULT CURRENT_DATE,
    token_number    INT NOT NULL,
    priority        VARCHAR(20) NOT NULL DEFAULT 'Normal'
        CHECK (priority IN ('Normal','Priority','Emergency')),
    status          VARCHAR(20) NOT NULL DEFAULT 'Waiting'
        CHECK (status IN ('Waiting','Called','InConsult','Done','Skipped','Cancelled')),
    checked_in_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    called_at       TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    UNIQUE (hospital_id, queue_date, token_number)
);

-- Staff-linking tables for the two facility types that didn't have one yet
-- (hospitals already had hospital_staff).
CREATE TABLE IF NOT EXISTS lab_staff (
    staff_id    INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    lab_id      INT NOT NULL REFERENCES laboratories(lab_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pharmacy_staff (
    staff_id     INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    profile_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    pharmacy_id  INT NOT NULL REFERENCES pharmacies(pharmacy_id) ON DELETE CASCADE
);

-- Link triage -> ambulance_requests now that both tables exist, and let
-- referrals/ambulance requests trace back to the triage that caused them.
ALTER TABLE ambulance_requests ADD COLUMN IF NOT EXISTS triage_id INT REFERENCES triage_assessments(triage_id) ON DELETE SET NULL;
ALTER TABLE referrals          ADD COLUMN IF NOT EXISTS triage_id INT REFERENCES triage_assessments(triage_id) ON DELETE SET NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'triage_ambulance_fk'
    ) THEN
        ALTER TABLE triage_assessments ADD CONSTRAINT triage_ambulance_fk
            FOREIGN KEY (linked_ambulance_request_id) REFERENCES ambulance_requests(request_id) ON DELETE SET NULL;
    END IF;
END $$;

-- Bilingual (English/Hindi) content for schemes, without a separate
-- translations table - matches this schema's existing pragmatic style.
ALTER TABLE health_schemes ADD COLUMN IF NOT EXISTS scheme_name_hi          VARCHAR(150);
ALTER TABLE health_schemes ADD COLUMN IF NOT EXISTS description_hi          TEXT;
ALTER TABLE health_schemes ADD COLUMN IF NOT EXISTS eligibility_criteria_hi TEXT;

-- ---------------------------------------------------------------------
-- 2. NEW HELPER FUNCTIONS (same SECURITY DEFINER pattern as Phase 1)
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_asha_id()
RETURNS INT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT asha_id FROM public.asha_workers WHERE profile_id = auth.uid() $$;

CREATE OR REPLACE FUNCTION public.current_staff_hospital_id()
RETURNS INT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT hospital_id FROM public.hospital_staff WHERE profile_id = auth.uid() LIMIT 1 $$;

CREATE OR REPLACE FUNCTION public.current_lab_id()
RETURNS INT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT lab_id FROM public.lab_staff WHERE profile_id = auth.uid() LIMIT 1 $$;

CREATE OR REPLACE FUNCTION public.current_pharmacy_id()
RETURNS INT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT pharmacy_id FROM public.pharmacy_staff WHERE profile_id = auth.uid() LIMIT 1 $$;

CREATE OR REPLACE FUNCTION public.current_ambulance_id()
RETURNS INT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT ambulance_id FROM public.ambulances WHERE driver_profile_id = auth.uid() $$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p JOIN public.roles r ON r.role_id = p.role_id
    WHERE p.id = auth.uid() AND r.role_name = 'Administrator'
  )
$$;

-- ---------------------------------------------------------------------
-- 3. RLS: enable on every new table
-- ---------------------------------------------------------------------

ALTER TABLE triage_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_tickets      ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_staff          ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_staff     ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- 4. RLS: policies for tables that existed but were locked (no policy)
-- ---------------------------------------------------------------------

-- --- asha_workers ------------------------------------------------------
DROP POLICY IF EXISTS "asha_select_authenticated" ON asha_workers;
CREATE POLICY "asha_select_authenticated" ON asha_workers
    FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "asha_insert_own" ON asha_workers;
CREATE POLICY "asha_insert_own" ON asha_workers
    FOR INSERT TO authenticated WITH CHECK (profile_id = auth.uid());
DROP POLICY IF EXISTS "asha_update_own" ON asha_workers;
CREATE POLICY "asha_update_own" ON asha_workers
    FOR UPDATE TO authenticated USING (profile_id = auth.uid());

-- --- asha_field_visits --------------------------------------------------
DROP POLICY IF EXISTS "field_visits_select" ON asha_field_visits;
CREATE POLICY "field_visits_select" ON asha_field_visits
    FOR SELECT TO authenticated
    USING (asha_id = current_asha_id() OR patient_id = current_patient_id() OR is_admin());
DROP POLICY IF EXISTS "field_visits_insert_own_asha" ON asha_field_visits;
CREATE POLICY "field_visits_insert_own_asha" ON asha_field_visits
    FOR INSERT TO authenticated WITH CHECK (asha_id = current_asha_id());
DROP POLICY IF EXISTS "field_visits_update_own_asha" ON asha_field_visits;
CREATE POLICY "field_visits_update_own_asha" ON asha_field_visits
    FOR UPDATE TO authenticated USING (asha_id = current_asha_id());

-- --- maternal_child_health_records --------------------------------------
DROP POLICY IF EXISTS "mch_select" ON maternal_child_health_records;
CREATE POLICY "mch_select" ON maternal_child_health_records
    FOR SELECT TO authenticated
    USING (
        patient_id = current_patient_id()
        OR recorded_by_profile_id = auth.uid()
        OR is_admin()
        OR EXISTS (SELECT 1 FROM appointments a WHERE a.patient_id = maternal_child_health_records.patient_id AND a.doctor_id = current_doctor_id())
    );
DROP POLICY IF EXISTS "mch_insert_recorder" ON maternal_child_health_records;
CREATE POLICY "mch_insert_recorder" ON maternal_child_health_records
    FOR INSERT TO authenticated WITH CHECK (recorded_by_profile_id = auth.uid());

-- --- vaccination_records -------------------------------------------------
DROP POLICY IF EXISTS "vaccination_select" ON vaccination_records;
CREATE POLICY "vaccination_select" ON vaccination_records
    FOR SELECT TO authenticated
    USING (
        patient_id = current_patient_id()
        OR administered_by_profile_id = auth.uid()
        OR is_admin()
        OR EXISTS (SELECT 1 FROM appointments a WHERE a.patient_id = vaccination_records.patient_id AND a.doctor_id = current_doctor_id())
    );
DROP POLICY IF EXISTS "vaccination_write_recorder" ON vaccination_records;
CREATE POLICY "vaccination_write_recorder" ON vaccination_records
    FOR ALL TO authenticated
    USING (administered_by_profile_id = auth.uid() OR is_admin())
    WITH CHECK (administered_by_profile_id = auth.uid() OR is_admin());

-- --- hospital_staff -------------------------------------------------------
DROP POLICY IF EXISTS "hospital_staff_select_authenticated" ON hospital_staff;
CREATE POLICY "hospital_staff_select_authenticated" ON hospital_staff
    FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "hospital_staff_insert_own" ON hospital_staff;
CREATE POLICY "hospital_staff_insert_own" ON hospital_staff
    FOR INSERT TO authenticated WITH CHECK (profile_id = auth.uid());

-- --- referrals -------------------------------------------------------------
DROP POLICY IF EXISTS "referrals_select" ON referrals;
CREATE POLICY "referrals_select" ON referrals
    FOR SELECT TO authenticated
    USING (
        referred_by_doctor_id = current_doctor_id()
        OR patient_id = current_patient_id()
        OR current_staff_hospital_id() IN (referred_from_hospital_id, referred_to_hospital_id)
        OR is_admin()
    );
DROP POLICY IF EXISTS "referrals_insert_doctor" ON referrals;
CREATE POLICY "referrals_insert_doctor" ON referrals
    FOR INSERT TO authenticated WITH CHECK (referred_by_doctor_id = current_doctor_id());
DROP POLICY IF EXISTS "referrals_update_involved" ON referrals;
CREATE POLICY "referrals_update_involved" ON referrals
    FOR UPDATE TO authenticated
    USING (
        referred_by_doctor_id = current_doctor_id()
        OR current_staff_hospital_id() = referred_to_hospital_id
        OR is_admin()
    );

-- --- laboratories / lab_test_catalog (directories, admin-managed) --------
DROP POLICY IF EXISTS "labs_select_authenticated" ON laboratories;
CREATE POLICY "labs_select_authenticated" ON laboratories FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "labs_write_admin" ON laboratories;
CREATE POLICY "labs_write_admin" ON laboratories FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "lab_catalog_select_authenticated" ON lab_test_catalog;
CREATE POLICY "lab_catalog_select_authenticated" ON lab_test_catalog FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "lab_catalog_write_admin" ON lab_test_catalog;
CREATE POLICY "lab_catalog_write_admin" ON lab_test_catalog FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- --- lab_staff ---------------------------------------------------------
DROP POLICY IF EXISTS "lab_staff_select_authenticated" ON lab_staff;
CREATE POLICY "lab_staff_select_authenticated" ON lab_staff FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "lab_staff_insert_own" ON lab_staff;
CREATE POLICY "lab_staff_insert_own" ON lab_staff FOR INSERT TO authenticated WITH CHECK (profile_id = auth.uid());

-- --- lab_test_orders -------------------------------------------------------
DROP POLICY IF EXISTS "lab_orders_select" ON lab_test_orders;
CREATE POLICY "lab_orders_select" ON lab_test_orders
    FOR SELECT TO authenticated
    USING (patient_id = current_patient_id() OR ordered_by_doctor_id = current_doctor_id() OR lab_id = current_lab_id() OR is_admin());
DROP POLICY IF EXISTS "lab_orders_insert_doctor" ON lab_test_orders;
CREATE POLICY "lab_orders_insert_doctor" ON lab_test_orders
    FOR INSERT TO authenticated WITH CHECK (ordered_by_doctor_id = current_doctor_id());
DROP POLICY IF EXISTS "lab_orders_update_lab" ON lab_test_orders;
CREATE POLICY "lab_orders_update_lab" ON lab_test_orders
    FOR UPDATE TO authenticated USING (lab_id = current_lab_id() OR is_admin());

-- --- pharmacies / medicine_catalog (directories, admin-managed) -----------
DROP POLICY IF EXISTS "pharmacies_select_authenticated" ON pharmacies;
CREATE POLICY "pharmacies_select_authenticated" ON pharmacies FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "pharmacies_write_admin" ON pharmacies;
CREATE POLICY "pharmacies_write_admin" ON pharmacies FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "medicine_catalog_select_authenticated" ON medicine_catalog;
CREATE POLICY "medicine_catalog_select_authenticated" ON medicine_catalog FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "medicine_catalog_write_admin" ON medicine_catalog;
CREATE POLICY "medicine_catalog_write_admin" ON medicine_catalog FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- --- pharmacy_staff ------------------------------------------------------
DROP POLICY IF EXISTS "pharmacy_staff_select_authenticated" ON pharmacy_staff;
CREATE POLICY "pharmacy_staff_select_authenticated" ON pharmacy_staff FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "pharmacy_staff_insert_own" ON pharmacy_staff;
CREATE POLICY "pharmacy_staff_insert_own" ON pharmacy_staff FOR INSERT TO authenticated WITH CHECK (profile_id = auth.uid());

-- --- medicine_availability -------------------------------------------------
DROP POLICY IF EXISTS "medicine_availability_select_authenticated" ON medicine_availability;
CREATE POLICY "medicine_availability_select_authenticated" ON medicine_availability
    FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "medicine_availability_write_own_pharmacy" ON medicine_availability;
CREATE POLICY "medicine_availability_write_own_pharmacy" ON medicine_availability
    FOR ALL TO authenticated
    USING (pharmacy_id = current_pharmacy_id() OR is_admin())
    WITH CHECK (pharmacy_id = current_pharmacy_id() OR is_admin());

-- --- ambulances -------------------------------------------------------------
DROP POLICY IF EXISTS "ambulances_select_authenticated" ON ambulances;
CREATE POLICY "ambulances_select_authenticated" ON ambulances FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "ambulances_insert_own" ON ambulances;
CREATE POLICY "ambulances_insert_own" ON ambulances
    FOR INSERT TO authenticated WITH CHECK (driver_profile_id = auth.uid());
DROP POLICY IF EXISTS "ambulances_update_own" ON ambulances;
CREATE POLICY "ambulances_update_own" ON ambulances
    FOR UPDATE TO authenticated USING (driver_profile_id = auth.uid() OR is_admin());

-- --- ambulance_requests -----------------------------------------------------
DROP POLICY IF EXISTS "ambulance_requests_select" ON ambulance_requests;
CREATE POLICY "ambulance_requests_select" ON ambulance_requests
    FOR SELECT TO authenticated
    USING (
        requested_by_profile_id = auth.uid()
        OR patient_id = current_patient_id()
        OR ambulance_id = current_ambulance_id()
        OR is_admin()
    );
DROP POLICY IF EXISTS "ambulance_requests_insert_own" ON ambulance_requests;
CREATE POLICY "ambulance_requests_insert_own" ON ambulance_requests
    FOR INSERT TO authenticated WITH CHECK (requested_by_profile_id = auth.uid());
DROP POLICY IF EXISTS "ambulance_requests_update_involved" ON ambulance_requests;
CREATE POLICY "ambulance_requests_update_involved" ON ambulance_requests
    FOR UPDATE TO authenticated
    USING (requested_by_profile_id = auth.uid() OR ambulance_id = current_ambulance_id() OR is_admin());

-- --- reminders ---------------------------------------------------------------
DROP POLICY IF EXISTS "reminders_select" ON reminders;
CREATE POLICY "reminders_select" ON reminders
    FOR SELECT TO authenticated USING (patient_id = current_patient_id() OR is_admin());
DROP POLICY IF EXISTS "reminders_insert" ON reminders;
CREATE POLICY "reminders_insert" ON reminders
    FOR INSERT TO authenticated
    WITH CHECK (
        patient_id = current_patient_id()
        OR is_admin()
        OR EXISTS (SELECT 1 FROM appointments a WHERE a.patient_id = reminders.patient_id AND a.doctor_id = current_doctor_id())
    );
DROP POLICY IF EXISTS "reminders_update_admin" ON reminders;
CREATE POLICY "reminders_update_admin" ON reminders
    FOR UPDATE TO authenticated USING (is_admin());

-- --- health_schemes (bilingual lookup, admin-managed) -------------------------
DROP POLICY IF EXISTS "schemes_select_authenticated" ON health_schemes;
CREATE POLICY "schemes_select_authenticated" ON health_schemes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "schemes_write_admin" ON health_schemes;
CREATE POLICY "schemes_write_admin" ON health_schemes FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- --- feedback -----------------------------------------------------------------
DROP POLICY IF EXISTS "feedback_select" ON feedback;
CREATE POLICY "feedback_select" ON feedback
    FOR SELECT TO authenticated
    USING (profile_id = auth.uid() OR current_staff_hospital_id() = hospital_id OR is_admin());
DROP POLICY IF EXISTS "feedback_insert_own" ON feedback;
CREATE POLICY "feedback_insert_own" ON feedback
    FOR INSERT TO authenticated WITH CHECK (profile_id = auth.uid());
DROP POLICY IF EXISTS "feedback_update_staff_or_admin" ON feedback;
CREATE POLICY "feedback_update_staff_or_admin" ON feedback
    FOR UPDATE TO authenticated USING (current_staff_hospital_id() = hospital_id OR is_admin());

-- ---------------------------------------------------------------------
-- 5. RLS: policies for the two brand-new tables
-- ---------------------------------------------------------------------

DROP POLICY IF EXISTS "triage_select" ON triage_assessments;
CREATE POLICY "triage_select" ON triage_assessments
    FOR SELECT TO authenticated
    USING (
        patient_id = current_patient_id()
        OR conducted_by_profile_id = auth.uid()
        OR is_admin()
        OR EXISTS (SELECT 1 FROM appointments a WHERE a.patient_id = triage_assessments.patient_id AND a.doctor_id = current_doctor_id())
    );
DROP POLICY IF EXISTS "triage_insert_own" ON triage_assessments;
CREATE POLICY "triage_insert_own" ON triage_assessments
    FOR INSERT TO authenticated WITH CHECK (conducted_by_profile_id = auth.uid());
DROP POLICY IF EXISTS "triage_update_own" ON triage_assessments;
CREATE POLICY "triage_update_own" ON triage_assessments
    FOR UPDATE TO authenticated USING (conducted_by_profile_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "queue_select" ON queue_tickets;
CREATE POLICY "queue_select" ON queue_tickets
    FOR SELECT TO authenticated
    USING (
        patient_id = current_patient_id()
        OR doctor_id = current_doctor_id()
        OR current_staff_hospital_id() = hospital_id
        OR is_admin()
    );
DROP POLICY IF EXISTS "queue_insert_patient_or_asha" ON queue_tickets;
CREATE POLICY "queue_insert_patient_or_asha" ON queue_tickets
    FOR INSERT TO authenticated
    WITH CHECK (patient_id = current_patient_id() OR current_asha_id() IS NOT NULL OR current_staff_hospital_id() = hospital_id);
DROP POLICY IF EXISTS "queue_update_hospital_or_doctor" ON queue_tickets;
CREATE POLICY "queue_update_hospital_or_doctor" ON queue_tickets
    FOR UPDATE TO authenticated
    USING (current_staff_hospital_id() = hospital_id OR doctor_id = current_doctor_id() OR is_admin());

-- ---------------------------------------------------------------------
-- 6. Widen existing Phase-1 policies to recognise the new roles
-- ---------------------------------------------------------------------

DROP POLICY IF EXISTS "patients_select_own_or_treating_doctor" ON patients;
CREATE POLICY "patients_select_own_or_treating_doctor" ON patients
    FOR SELECT TO authenticated
    USING (
        profile_id = auth.uid()
        OR registered_by_asha_id = current_asha_id()
        OR is_admin()
        OR EXISTS (SELECT 1 FROM appointments a WHERE a.patient_id = patients.patient_id AND a.doctor_id = current_doctor_id())
    );

-- ---------------------------------------------------------------------
-- 7. Indexes for the new tables
-- ---------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_triage_patient        ON triage_assessments(patient_id);
CREATE INDEX IF NOT EXISTS idx_queue_hospital_date    ON queue_tickets(hospital_id, queue_date, status);
CREATE INDEX IF NOT EXISTS idx_lab_staff_lab          ON lab_staff(lab_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_staff_pharm   ON pharmacy_staff(pharmacy_id);

-- ---------------------------------------------------------------------
-- 8. Seed data: languages, a Maharashtra sample directory
-- ---------------------------------------------------------------------

INSERT INTO languages (language_name, language_code) VALUES
    ('English', 'en'), ('Hindi', 'hi')
ON CONFLICT (language_code) DO NOTHING;

INSERT INTO states (state_name) VALUES ('Maharashtra') ON CONFLICT (state_name) DO NOTHING;

INSERT INTO districts (district_name, state_id)
SELECT 'Palghar', state_id FROM states WHERE state_name = 'Maharashtra'
ON CONFLICT (district_name, state_id) DO NOTHING;
INSERT INTO districts (district_name, state_id)
SELECT 'Gadchiroli', state_id FROM states WHERE state_name = 'Maharashtra'
ON CONFLICT (district_name, state_id) DO NOTHING;

INSERT INTO villages (village_name, district_id)
SELECT 'Wada', district_id FROM districts WHERE district_name = 'Palghar'
AND NOT EXISTS (SELECT 1 FROM villages WHERE village_name = 'Wada');
INSERT INTO villages (village_name, district_id)
SELECT 'Etapalli', district_id FROM districts WHERE district_name = 'Gadchiroli'
AND NOT EXISTS (SELECT 1 FROM villages WHERE village_name = 'Etapalli');

INSERT INTO hospitals (name, facility_type, district_id, has_emergency_services)
SELECT 'Wada Primary Health Centre', 'PHC', district_id, true FROM districts WHERE district_name = 'Palghar'
AND NOT EXISTS (SELECT 1 FROM hospitals WHERE name = 'Wada Primary Health Centre');
INSERT INTO hospitals (name, facility_type, district_id, has_emergency_services)
SELECT 'Gadchiroli District Hospital', 'DistrictHospital', district_id, true FROM districts WHERE district_name = 'Gadchiroli'
AND NOT EXISTS (SELECT 1 FROM hospitals WHERE name = 'Gadchiroli District Hospital');

INSERT INTO laboratories (name, district_id)
SELECT 'Palghar District Diagnostic Lab', district_id FROM districts WHERE district_name = 'Palghar'
AND NOT EXISTS (SELECT 1 FROM laboratories WHERE name = 'Palghar District Diagnostic Lab');

INSERT INTO pharmacies (name, district_id)
SELECT 'Wada PHC Pharmacy', district_id FROM districts WHERE district_name = 'Palghar'
AND NOT EXISTS (SELECT 1 FROM pharmacies WHERE name = 'Wada PHC Pharmacy');

INSERT INTO lab_test_catalog (test_name, category)
SELECT v.test_name, v.category FROM (VALUES
    ('Complete Blood Count', 'Pathology'), ('Blood Sugar (Fasting)', 'Biochemistry'),
    ('Malaria Antigen Test', 'Serology'), ('Urine Routine', 'Pathology')
) AS v(test_name, category)
WHERE NOT EXISTS (SELECT 1 FROM lab_test_catalog WHERE test_name = v.test_name);

INSERT INTO medicine_catalog (medicine_name, generic_name, category)
SELECT v.medicine_name, v.generic_name, v.category FROM (VALUES
    ('Paracetamol 500mg', 'Paracetamol', 'Analgesic'),
    ('ORS Sachet', 'Oral Rehydration Salts', 'Rehydration'),
    ('Amoxicillin 500mg', 'Amoxicillin', 'Antibiotic'),
    ('Iron Folic Acid Tablet', 'Ferrous Salt + Folic Acid', 'Supplement')
) AS v(medicine_name, generic_name, category)
WHERE NOT EXISTS (SELECT 1 FROM medicine_catalog WHERE medicine_name = v.medicine_name);

INSERT INTO health_schemes (scheme_name, description, eligibility_criteria, scheme_name_hi, description_hi, eligibility_criteria_hi)
SELECT
    'Ayushman Bharat - PMJAY',
    'Free hospitalisation cover up to Rs. 5 lakh per family per year at empanelled hospitals.',
    'Families identified per SECC 2011 deprivation criteria.',
    'आयुष्मान भारत - पीएमजेएवाई',
    'सूचीबद्ध अस्पतालों में प्रति परिवार प्रति वर्ष 5 लाख रुपये तक का मुफ्त अस्पताल उपचार कवर।',
    'एसईसीसी 2011 की वंचन श्रेणियों के अनुसार पहचाने गए परिवार।'
WHERE NOT EXISTS (SELECT 1 FROM health_schemes WHERE scheme_name = 'Ayushman Bharat - PMJAY');

-- ---------------------------------------------------------------------
-- 9. Run ONCE, manually, after you've signed up your own admin account
-- through the normal signup form (any role) - promotes that one profile
-- to Administrator. Replace the email before running; commented out so
-- pasting this whole file never runs it by accident.
-- ---------------------------------------------------------------------

-- UPDATE profiles SET role_id = (SELECT role_id FROM roles WHERE role_name = 'Administrator')
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'YOUR_ADMIN_EMAIL_HERE');
