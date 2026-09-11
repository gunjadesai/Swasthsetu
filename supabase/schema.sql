-- =====================================================================
-- RURAL HEALTHCARE ACCESSIBILITY PLATFORM
-- Supabase (Postgres + Auth + RLS) schema - Phase 1
-- =====================================================================
--
-- This replaces the earlier standalone Postgres version. The structural
-- difference: authentication is now handled by Supabase's built-in
-- auth.users table, not a hand-rolled users/password_hash table. A new
-- public.profiles table (same UUID as auth.users.id) carries the app-
-- level fields (name, phone, role, avatar). Every table that used to
-- reference users(user_id int) now references profiles(id uuid).
--
-- HOW TO RUN THIS
-- ----------------
-- 1. Supabase dashboard -> SQL Editor -> paste this file -> Run.
--    Section 0 below drops every table/function this script owns
--    before recreating them, so this file is safe to paste and run
--    again any time - including after a partial run, or one made with
--    an older version of this file that had different columns. This
--    IS destructive to any data already in those tables - only run it
--    on a project with no real data yet (Phase 1 prototype).
-- 2. Supabase dashboard -> Authentication -> Providers -> Email ->
--    turn OFF "Confirm email". This is a Phase 1 prototype
--    simplification so signup gets an active session immediately
--    instead of waiting on a confirmation link. Turn it back on (and
--    add a proper confirmation flow) before any real deployment.
--
-- SCOPE OF THIS FILE
-- -------------------
-- Every table from the full platform design is created now (so later
-- phases don't need schema churn), but Row Level Security is only
-- POLICIED for what Phase 1 actually uses: profiles, roles/lookup
-- tables, hospitals, doctors, doctor_availability, patients,
-- patient_medical_history, appointments, medical_records,
-- prescriptions, prescription_items, attachments. Every other table
-- has RLS enabled with NO policy, which means nobody (except the
-- service_role key, used only in trusted server contexts) can touch
-- them yet - they're reserved for their own phase, not open holes.
-- =====================================================================


-- =====================================================================
-- 0. RESET (makes this script safe to re-run, even after schema edits)
-- =====================================================================
-- Drops everything this script owns, in one shot, so pasting the whole
-- file again - after a partial run, an error partway through, or an
-- edit to a table's columns - always ends up matching this file
-- exactly instead of silently keeping a stale table shape. CASCADE
-- takes dependent policies, indexes and foreign keys with it, so
-- order doesn't matter. DESTROYS DATA - only for a project with
-- nothing real in it yet.

DROP TABLE IF EXISTS
    feedback, health_schemes, reminders,
    ambulance_requests, ambulances,
    medicine_availability, medicine_catalog, pharmacies,
    lab_test_orders, lab_test_catalog, laboratories,
    referrals, prescription_items, prescriptions, medical_records,
    teleconsult_sessions, appointments,
    doctor_availability, doctors,
    asha_field_visits, vaccination_records, maternal_child_health_records,
    patient_medical_history, patients,
    asha_workers,
    hospital_staff, hospitals,
    attachments, audit_logs, profiles,
    villages, districts, states, languages, roles
    CASCADE;

DROP FUNCTION IF EXISTS public.current_role_name();
DROP FUNCTION IF EXISTS public.current_patient_id();
DROP FUNCTION IF EXISTS public.current_doctor_id();


-- =====================================================================
-- 1. REFERENCE / LOOKUP TABLES
-- =====================================================================

CREATE TABLE roles (
    role_id     INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    role_name   VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE languages (
    language_id     INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    language_name   VARCHAR(50) NOT NULL UNIQUE,
    language_code   VARCHAR(10) NOT NULL UNIQUE
);

CREATE TABLE states (
    state_id    INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    state_name  VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE districts (
    district_id    INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    district_name  VARCHAR(100) NOT NULL,
    state_id       INT NOT NULL REFERENCES states(state_id),
    UNIQUE (district_name, state_id)
);

CREATE TABLE villages (
    village_id    INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    village_name  VARCHAR(150) NOT NULL,
    district_id   INT NOT NULL REFERENCES districts(district_id),
    latitude      NUMERIC(9,6),
    longitude     NUMERIC(9,6)
);


-- =====================================================================
-- 2. PROFILES (replaces the old custom `users` table)
-- =====================================================================

CREATE TABLE profiles (
    id                            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name                     VARCHAR(150) NOT NULL,
    phone_number                  VARCHAR(15),
    role_id                       INT NOT NULL REFERENCES roles(role_id),
    preferred_language_id         INT REFERENCES languages(language_id),
    village_id                    INT REFERENCES villages(village_id),
    avatar_url                    VARCHAR(500),
    avatar_cloudinary_public_id   VARCHAR(255),
    is_active                     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                    TIMESTAMPTZ
);

CREATE TABLE audit_logs (
    audit_log_id  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    profile_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action        VARCHAR(100) NOT NULL,
    entity_name   VARCHAR(100),
    entity_id     VARCHAR(50),
    details       TEXT,
    ip_address    VARCHAR(50),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Generic attachments table: any record that can have a photo (profile
-- avatar goes on profiles directly for speed, but lab scans,
-- prescription photos, hospital photos etc. all attach here without
-- needing a new column every time). related_id is TEXT because the
-- tables it can point to use a mix of INT and UUID primary keys.
CREATE TABLE attachments (
    attachment_id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    owner_profile_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    related_table          VARCHAR(50) NOT NULL,
    related_id             TEXT NOT NULL,
    cloudinary_public_id   VARCHAR(255) NOT NULL,
    url                    VARCHAR(500) NOT NULL,
    file_type              VARCHAR(30) NOT NULL DEFAULT 'image',
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- =====================================================================
-- 3. HOSPITAL / PHC / CHC MODULE
-- =====================================================================

CREATE TABLE hospitals (
    hospital_id            INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name                   VARCHAR(200) NOT NULL,
    facility_type          VARCHAR(30) NOT NULL
        CHECK (facility_type IN ('PHC','CHC','DistrictHospital','GovtHospital')),
    district_id            INT NOT NULL REFERENCES districts(district_id),
    address                VARCHAR(255),
    latitude               NUMERIC(9,6),
    longitude              NUMERIC(9,6),
    contact_number         VARCHAR(15),
    has_emergency_services BOOLEAN NOT NULL DEFAULT FALSE,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE hospital_staff (
    staff_id     INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    profile_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    hospital_id  INT NOT NULL REFERENCES hospitals(hospital_id) ON DELETE CASCADE,
    designation  VARCHAR(100)
);


-- =====================================================================
-- 4. ASHA WORKER MODULE (tables exist now, RLS locked until Phase 2)
-- =====================================================================

CREATE TABLE asha_workers (
    asha_id              INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    profile_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    assigned_village_id  INT NOT NULL REFERENCES villages(village_id),
    asha_code            VARCHAR(30) UNIQUE,
    supervisor_phc_id    INT REFERENCES hospitals(hospital_id),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- =====================================================================
-- 5. PATIENT MODULE
-- =====================================================================

CREATE TABLE patients (
    patient_id            INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    profile_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    date_of_birth         DATE,
    gender                VARCHAR(20),
    blood_group           VARCHAR(5),
    address               VARCHAR(255),
    emergency_contact     VARCHAR(15),
    registered_by_asha_id INT REFERENCES asha_workers(asha_id) ON DELETE SET NULL,
    health_id_number      VARCHAR(50) UNIQUE,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE patient_medical_history (
    history_id           INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    patient_id           INT NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
    condition_name       VARCHAR(150) NOT NULL,
    notes                TEXT,
    diagnosed_date       DATE,
    recorded_by_profile_id UUID REFERENCES profiles(id),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE maternal_child_health_records (
    record_id            INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    patient_id           INT NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
    record_type          VARCHAR(30) NOT NULL
        CHECK (record_type IN ('Antenatal','Postnatal','ChildGrowth')),
    visit_date           DATE NOT NULL,
    weight_kg            NUMERIC(5,2),
    blood_pressure       VARCHAR(15),
    risk_level           VARCHAR(20) CHECK (risk_level IN ('Low','Medium','High')),
    notes                TEXT,
    recorded_by_profile_id UUID REFERENCES profiles(id),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE vaccination_records (
    vaccination_id            INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    patient_id                INT NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
    vaccine_name              VARCHAR(100) NOT NULL,
    dose_number               INT NOT NULL DEFAULT 1,
    scheduled_date            DATE NOT NULL,
    administered_date         DATE,
    status                    VARCHAR(20) NOT NULL DEFAULT 'Pending'
        CHECK (status IN ('Pending','Completed','Missed')),
    administered_by_profile_id UUID REFERENCES profiles(id)
);

CREATE TABLE asha_field_visits (
    visit_id                INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    asha_id                 INT NOT NULL REFERENCES asha_workers(asha_id),
    patient_id              INT NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
    visit_date              DATE NOT NULL,
    purpose                 VARCHAR(150),
    notes                   TEXT,
    is_synced_from_offline  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- =====================================================================
-- 6. DOCTOR MODULE
-- =====================================================================

CREATE TABLE doctors (
    doctor_id            INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    profile_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    specialization       VARCHAR(100),
    registration_number  VARCHAR(50) UNIQUE,
    primary_hospital_id  INT REFERENCES hospitals(hospital_id),
    supports_teleconsult BOOLEAN NOT NULL DEFAULT TRUE,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE doctor_availability (
    availability_id       INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    doctor_id             INT NOT NULL REFERENCES doctors(doctor_id) ON DELETE CASCADE,
    hospital_id           INT REFERENCES hospitals(hospital_id),
    day_of_week           SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time            TIME NOT NULL,
    end_time              TIME NOT NULL,
    slot_duration_minutes INT NOT NULL DEFAULT 15,
    is_teleconsult_slot   BOOLEAN NOT NULL DEFAULT FALSE,
    CHECK (end_time > start_time)
);


-- =====================================================================
-- 7. HELPER FUNCTIONS (used throughout the RLS policies below)
-- =====================================================================
-- SECURITY DEFINER so they can read profiles/patients/doctors on the
-- caller's behalf without those reads themselves needing an RLS policy
-- that could recurse. Each is STABLE (safe to call repeatedly per
-- statement) and scoped to auth.uid() - never take a parameter for
-- whose identity to check, so they can't be used to peek at someone
-- else's role/ids.
-- Placed after patients/doctors are created (not right after profiles)
-- because Postgres validates a SQL function's body - including that
-- the tables it queries exist - at CREATE time, not just at call time.

CREATE OR REPLACE FUNCTION public.current_role_name()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT r.role_name
  FROM public.profiles p
  JOIN public.roles r ON r.role_id = p.role_id
  WHERE p.id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.current_patient_id()
RETURNS INT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT patient_id FROM public.patients WHERE profile_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.current_doctor_id()
RETURNS INT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT doctor_id FROM public.doctors WHERE profile_id = auth.uid()
$$;


-- =====================================================================
-- 8. APPOINTMENTS & TELECONSULTATION
-- =====================================================================

CREATE TABLE appointments (
    appointment_id       INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    patient_id           INT NOT NULL REFERENCES patients(patient_id),
    doctor_id            INT NOT NULL REFERENCES doctors(doctor_id),
    hospital_id          INT REFERENCES hospitals(hospital_id),
    appointment_date     DATE NOT NULL,
    appointment_time     TIME NOT NULL,
    mode                 VARCHAR(20) NOT NULL DEFAULT 'InPerson'
        CHECK (mode IN ('InPerson','Teleconsult')),
    status               VARCHAR(20) NOT NULL DEFAULT 'Scheduled'
        CHECK (status IN ('Scheduled','Completed','Cancelled','NoShow')),
    booked_by_profile_id UUID REFERENCES profiles(id),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE teleconsult_sessions (
    session_id         INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    appointment_id     INT NOT NULL REFERENCES appointments(appointment_id) ON DELETE CASCADE,
    meeting_link       VARCHAR(255),
    started_at         TIMESTAMPTZ,
    ended_at           TIMESTAMPTZ,
    connection_quality VARCHAR(20) CHECK (connection_quality IN ('Good','Fair','Poor'))
);


-- =====================================================================
-- 9. MEDICAL RECORDS, PRESCRIPTIONS & REFERRALS
-- =====================================================================

CREATE TABLE medical_records (
    record_id      INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    patient_id     INT NOT NULL REFERENCES patients(patient_id),
    appointment_id INT REFERENCES appointments(appointment_id),
    doctor_id      INT NOT NULL REFERENCES doctors(doctor_id),
    diagnosis      VARCHAR(500),
    symptoms       VARCHAR(500),
    notes          TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE prescriptions (
    prescription_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    record_id       INT NOT NULL REFERENCES medical_records(record_id),
    doctor_id       INT NOT NULL REFERENCES doctors(doctor_id),
    patient_id      INT NOT NULL REFERENCES patients(patient_id),
    issued_date     DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE prescription_items (
    prescription_item_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    prescription_id      INT NOT NULL REFERENCES prescriptions(prescription_id) ON DELETE CASCADE,
    medicine_name        VARCHAR(150) NOT NULL,
    dosage               VARCHAR(100),
    duration_days        INT,
    instructions         VARCHAR(255)
);

CREATE TABLE referrals (
    referral_id                INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    patient_id                 INT NOT NULL REFERENCES patients(patient_id),
    referred_from_hospital_id  INT REFERENCES hospitals(hospital_id),
    referred_to_hospital_id    INT NOT NULL REFERENCES hospitals(hospital_id),
    referred_by_doctor_id      INT REFERENCES doctors(doctor_id),
    reason                     VARCHAR(255),
    urgency_level              VARCHAR(20) NOT NULL DEFAULT 'Normal'
        CHECK (urgency_level IN ('Normal','Urgent','Emergency')),
    status                     VARCHAR(20) NOT NULL DEFAULT 'Pending'
        CHECK (status IN ('Pending','Accepted','Completed','Cancelled')),
    created_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- =====================================================================
-- 10. LABORATORY MODULE
-- =====================================================================

CREATE TABLE laboratories (
    lab_id         INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name           VARCHAR(150) NOT NULL,
    hospital_id    INT REFERENCES hospitals(hospital_id),
    district_id    INT NOT NULL REFERENCES districts(district_id),
    contact_number VARCHAR(15)
);

CREATE TABLE lab_test_catalog (
    test_id   INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    test_name VARCHAR(150) NOT NULL,
    category  VARCHAR(100)
);

CREATE TABLE lab_test_orders (
    order_id             INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    record_id            INT NOT NULL REFERENCES medical_records(record_id),
    patient_id           INT NOT NULL REFERENCES patients(patient_id),
    lab_id               INT NOT NULL REFERENCES laboratories(lab_id),
    test_id              INT NOT NULL REFERENCES lab_test_catalog(test_id),
    ordered_by_doctor_id INT NOT NULL REFERENCES doctors(doctor_id),
    status               VARCHAR(20) NOT NULL DEFAULT 'Ordered'
        CHECK (status IN ('Ordered','SampleCollected','ResultReady')),
    result_summary       TEXT,
    result_file_path     VARCHAR(255),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- =====================================================================
-- 11. PHARMACY MODULE
-- =====================================================================

CREATE TABLE pharmacies (
    pharmacy_id    INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name           VARCHAR(150) NOT NULL,
    hospital_id    INT REFERENCES hospitals(hospital_id),
    district_id    INT NOT NULL REFERENCES districts(district_id),
    contact_number VARCHAR(15)
);

CREATE TABLE medicine_catalog (
    medicine_id   INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    medicine_name VARCHAR(150) NOT NULL,
    generic_name  VARCHAR(150),
    category      VARCHAR(100)
);

CREATE TABLE medicine_availability (
    availability_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pharmacy_id     INT NOT NULL REFERENCES pharmacies(pharmacy_id) ON DELETE CASCADE,
    medicine_id     INT NOT NULL REFERENCES medicine_catalog(medicine_id) ON DELETE CASCADE,
    stock_quantity  INT NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    last_updated    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (pharmacy_id, medicine_id)
);


-- =====================================================================
-- 12. AMBULANCE / EMERGENCY MODULE
-- =====================================================================

CREATE TABLE ambulances (
    ambulance_id       INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    vehicle_number     VARCHAR(30) NOT NULL UNIQUE,
    driver_profile_id  UUID REFERENCES profiles(id),
    district_id        INT NOT NULL REFERENCES districts(district_id),
    is_available       BOOLEAN NOT NULL DEFAULT TRUE,
    current_latitude   NUMERIC(9,6),
    current_longitude  NUMERIC(9,6)
);

CREATE TABLE ambulance_requests (
    request_id              INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    patient_id              INT REFERENCES patients(patient_id),
    requested_by_profile_id UUID NOT NULL REFERENCES profiles(id),
    ambulance_id            INT REFERENCES ambulances(ambulance_id),
    pickup_latitude         NUMERIC(9,6),
    pickup_longitude        NUMERIC(9,6),
    destination_hospital_id INT REFERENCES hospitals(hospital_id),
    status                  VARCHAR(20) NOT NULL DEFAULT 'Requested'
        CHECK (status IN ('Requested','Dispatched','Completed','Cancelled')),
    requested_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at            TIMESTAMPTZ
);


-- =====================================================================
-- 13. REMINDERS, SCHEMES, FEEDBACK & MONITORING
-- =====================================================================

CREATE TABLE reminders (
    reminder_id    INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    patient_id     INT NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
    reminder_type  VARCHAR(30) NOT NULL
        CHECK (reminder_type IN ('Vaccination','Medicine','Appointment','FollowUp')),
    reference_id   INT,
    message        VARCHAR(255) NOT NULL,
    scheduled_for  TIMESTAMPTZ NOT NULL,
    channel        VARCHAR(20) NOT NULL DEFAULT 'SMS'
        CHECK (channel IN ('SMS','IVR','App')),
    status         VARCHAR(20) NOT NULL DEFAULT 'Pending'
        CHECK (status IN ('Pending','Sent','Failed')),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE health_schemes (
    scheme_id            INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    scheme_name          VARCHAR(150) NOT NULL,
    description          TEXT,
    eligibility_criteria TEXT,
    is_active            BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE feedback (
    feedback_id    INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    profile_id     UUID NOT NULL REFERENCES profiles(id),
    hospital_id    INT REFERENCES hospitals(hospital_id),
    appointment_id INT REFERENCES appointments(appointment_id),
    category       VARCHAR(30) NOT NULL DEFAULT 'General'
        CHECK (category IN ('General','Complaint','ServiceQuality')),
    rating         SMALLINT CHECK (rating BETWEEN 1 AND 5),
    comments       TEXT,
    status         VARCHAR(20) NOT NULL DEFAULT 'Open'
        CHECK (status IN ('Open','Reviewed','Resolved')),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- =====================================================================
-- 14. INDEXES
-- =====================================================================

CREATE INDEX idx_appointments_patient_date    ON appointments(patient_id, appointment_date);
CREATE INDEX idx_appointments_doctor_date     ON appointments(doctor_id, appointment_date);
CREATE INDEX idx_patients_registered_by_asha  ON patients(registered_by_asha_id);
CREATE INDEX idx_hospitals_district           ON hospitals(district_id);
CREATE INDEX idx_medicine_availability_pharm  ON medicine_availability(pharmacy_id, medicine_id);
CREATE INDEX idx_reminders_scheduled          ON reminders(scheduled_for, status);
CREATE INDEX idx_referrals_status             ON referrals(status, urgency_level);
CREATE INDEX idx_villages_district            ON villages(district_id);
CREATE INDEX idx_doctors_hospital             ON doctors(primary_hospital_id);
CREATE INDEX idx_lab_orders_status            ON lab_test_orders(status);
CREATE INDEX idx_ambulance_requests_status    ON ambulance_requests(status);
CREATE INDEX idx_users_role                   ON profiles(role_id);
CREATE INDEX idx_attachments_owner            ON attachments(owner_profile_id);
CREATE INDEX idx_attachments_related          ON attachments(related_table, related_id);


-- =====================================================================
-- 15. SEED DATA
-- =====================================================================

INSERT INTO roles (role_name) VALUES
    ('Patient'), ('ASHAWorker'), ('Doctor'), ('HospitalStaff'),
    ('LabStaff'), ('PharmacyStaff'), ('AmbulanceProvider'), ('Administrator')
ON CONFLICT (role_name) DO NOTHING;


-- =====================================================================
-- 16. ROW LEVEL SECURITY
-- =====================================================================
-- ENABLE ROW LEVEL SECURITY is idempotent already - safe to re-run.

ALTER TABLE roles                          ENABLE ROW LEVEL SECURITY;
ALTER TABLE languages                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE states                         ENABLE ROW LEVEL SECURITY;
ALTER TABLE districts                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE villages                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospitals                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospital_staff                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE asha_workers                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_medical_history        ENABLE ROW LEVEL SECURITY;
ALTER TABLE maternal_child_health_records  ENABLE ROW LEVEL SECURITY;
ALTER TABLE vaccination_records            ENABLE ROW LEVEL SECURITY;
ALTER TABLE asha_field_visits              ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors                        ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_availability            ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE teleconsult_sessions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_records                ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescription_items             ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE laboratories                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_test_catalog               ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_test_orders                ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacies                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicine_catalog               ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicine_availability          ENABLE ROW LEVEL SECURITY;
ALTER TABLE ambulances                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE ambulance_requests             ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_schemes                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback                       ENABLE ROW LEVEL SECURITY;

-- Postgres has no "CREATE POLICY IF NOT EXISTS", so each policy below
-- is dropped first (no-op if it doesn't exist yet) then recreated -
-- the idempotent equivalent, and it lets a re-run pick up edits to a
-- policy's definition too.

-- --- Lookup / reference tables: readable by any signed-in user -------
DROP POLICY IF EXISTS "read_all_authenticated" ON roles;
CREATE POLICY "read_all_authenticated" ON roles      FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "read_all_authenticated" ON languages;
CREATE POLICY "read_all_authenticated" ON languages  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "read_all_authenticated" ON states;
CREATE POLICY "read_all_authenticated" ON states      FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "read_all_authenticated" ON districts;
CREATE POLICY "read_all_authenticated" ON districts   FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "read_all_authenticated" ON villages;
CREATE POLICY "read_all_authenticated" ON villages    FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "read_all_authenticated" ON hospitals;
CREATE POLICY "read_all_authenticated" ON hospitals   FOR SELECT TO authenticated USING (true);

-- --- profiles -----------------------------------------------------------
-- Any signed-in user can read any profile (needed so a patient sees
-- their doctor's name and vice versa) - profiles has no medical data.
DROP POLICY IF EXISTS "profiles_select_authenticated" ON profiles;
CREATE POLICY "profiles_select_authenticated" ON profiles
    FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles
    FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
    FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- --- doctors --------------------------------------------------------
DROP POLICY IF EXISTS "doctors_select_authenticated" ON doctors;
CREATE POLICY "doctors_select_authenticated" ON doctors
    FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "doctors_insert_own" ON doctors;
CREATE POLICY "doctors_insert_own" ON doctors
    FOR INSERT TO authenticated WITH CHECK (profile_id = auth.uid());
DROP POLICY IF EXISTS "doctors_update_own" ON doctors;
CREATE POLICY "doctors_update_own" ON doctors
    FOR UPDATE TO authenticated USING (profile_id = auth.uid());

-- --- doctor_availability ----------------------------------------------
DROP POLICY IF EXISTS "availability_select_authenticated" ON doctor_availability;
CREATE POLICY "availability_select_authenticated" ON doctor_availability
    FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "availability_write_own" ON doctor_availability;
CREATE POLICY "availability_write_own" ON doctor_availability
    FOR ALL TO authenticated
    USING (doctor_id = current_doctor_id())
    WITH CHECK (doctor_id = current_doctor_id());

-- --- patients ---------------------------------------------------------
DROP POLICY IF EXISTS "patients_insert_own" ON patients;
CREATE POLICY "patients_insert_own" ON patients
    FOR INSERT TO authenticated WITH CHECK (profile_id = auth.uid());
DROP POLICY IF EXISTS "patients_select_own_or_treating_doctor" ON patients;
CREATE POLICY "patients_select_own_or_treating_doctor" ON patients
    FOR SELECT TO authenticated
    USING (
        profile_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM appointments a
            WHERE a.patient_id = patients.patient_id
              AND a.doctor_id = current_doctor_id()
        )
    );
DROP POLICY IF EXISTS "patients_update_own" ON patients;
CREATE POLICY "patients_update_own" ON patients
    FOR UPDATE TO authenticated USING (profile_id = auth.uid());

-- --- patient_medical_history --------------------------------------------
DROP POLICY IF EXISTS "history_select_own_or_treating_doctor" ON patient_medical_history;
CREATE POLICY "history_select_own_or_treating_doctor" ON patient_medical_history
    FOR SELECT TO authenticated
    USING (
        patient_id = current_patient_id()
        OR EXISTS (
            SELECT 1 FROM appointments a
            WHERE a.patient_id = patient_medical_history.patient_id
              AND a.doctor_id = current_doctor_id()
        )
    );
DROP POLICY IF EXISTS "history_insert_own_or_treating_doctor" ON patient_medical_history;
CREATE POLICY "history_insert_own_or_treating_doctor" ON patient_medical_history
    FOR INSERT TO authenticated
    WITH CHECK (
        patient_id = current_patient_id()
        OR EXISTS (
            SELECT 1 FROM appointments a
            WHERE a.patient_id = patient_medical_history.patient_id
              AND a.doctor_id = current_doctor_id()
        )
    );

-- --- appointments -------------------------------------------------------
DROP POLICY IF EXISTS "appointments_select_own" ON appointments;
CREATE POLICY "appointments_select_own" ON appointments
    FOR SELECT TO authenticated
    USING (patient_id = current_patient_id() OR doctor_id = current_doctor_id());
DROP POLICY IF EXISTS "appointments_insert_own_patient" ON appointments;
CREATE POLICY "appointments_insert_own_patient" ON appointments
    FOR INSERT TO authenticated
    WITH CHECK (patient_id = current_patient_id() AND booked_by_profile_id = auth.uid());
DROP POLICY IF EXISTS "appointments_update_own" ON appointments;
CREATE POLICY "appointments_update_own" ON appointments
    FOR UPDATE TO authenticated
    USING (patient_id = current_patient_id() OR doctor_id = current_doctor_id());

-- --- medical_records ------------------------------------------------
DROP POLICY IF EXISTS "records_select_own" ON medical_records;
CREATE POLICY "records_select_own" ON medical_records
    FOR SELECT TO authenticated
    USING (patient_id = current_patient_id() OR doctor_id = current_doctor_id());
DROP POLICY IF EXISTS "records_insert_treating_doctor" ON medical_records;
CREATE POLICY "records_insert_treating_doctor" ON medical_records
    FOR INSERT TO authenticated WITH CHECK (doctor_id = current_doctor_id());

-- --- prescriptions --------------------------------------------------
DROP POLICY IF EXISTS "prescriptions_select_own" ON prescriptions;
CREATE POLICY "prescriptions_select_own" ON prescriptions
    FOR SELECT TO authenticated
    USING (patient_id = current_patient_id() OR doctor_id = current_doctor_id());
DROP POLICY IF EXISTS "prescriptions_insert_treating_doctor" ON prescriptions;
CREATE POLICY "prescriptions_insert_treating_doctor" ON prescriptions
    FOR INSERT TO authenticated WITH CHECK (doctor_id = current_doctor_id());

-- --- prescription_items -----------------------------------------------
DROP POLICY IF EXISTS "prescription_items_select_own" ON prescription_items;
CREATE POLICY "prescription_items_select_own" ON prescription_items
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM prescriptions p
            WHERE p.prescription_id = prescription_items.prescription_id
              AND (p.patient_id = current_patient_id() OR p.doctor_id = current_doctor_id())
        )
    );
DROP POLICY IF EXISTS "prescription_items_insert_treating_doctor" ON prescription_items;
CREATE POLICY "prescription_items_insert_treating_doctor" ON prescription_items
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM prescriptions p
            WHERE p.prescription_id = prescription_items.prescription_id
              AND p.doctor_id = current_doctor_id()
        )
    );

-- --- attachments --------------------------------------------------------
-- Phase 1 scope: everyone manages only their own uploads. Widen this
-- once lab/prescription scans need doctor-side visibility too.
DROP POLICY IF EXISTS "attachments_own" ON attachments;
CREATE POLICY "attachments_own" ON attachments
    FOR ALL TO authenticated
    USING (owner_profile_id = auth.uid())
    WITH CHECK (owner_profile_id = auth.uid());

-- Every other table (asha_workers, asha_field_visits,
-- maternal_child_health_records, vaccination_records, hospital_staff,
-- referrals, laboratories, lab_test_catalog, lab_test_orders,
-- pharmacies, medicine_catalog, medicine_availability, ambulances,
-- ambulance_requests, reminders, health_schemes, feedback,
-- audit_logs) has RLS enabled above with NO policy - reserved for its
-- own phase. Add policies for a table here when you actually build
-- the feature that uses it.
