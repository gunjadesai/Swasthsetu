-- =====================================================================
-- SWASTHSETU - Migration 004: high-priority fixes
-- =====================================================================
--   1. Staff verification - Doctor / ASHA / Hospital / Lab / Pharmacy /
--      Ambulance accounts need an administrator's approval before they
--      can see any patient data. Also stops users changing their own
--      role or verification status (closes the "make yourself
--      Administrator" hole for self-service updates and signups).
--   2. Walk-in queue - tokens are allocated inside the database, so the
--      second patient of the day no longer fails with "Queue is busy".
--   3. Appointments - availability sees every booking (without exposing
--      who booked), and the database refuses a second booking for the
--      same doctor, date and time.
--
-- Run after 003. Additive and safe to paste more than once.
-- HOW TO RUN: Supabase dashboard -> SQL Editor -> paste this file -> Run.
--
-- Existing accounts are grandfathered as Verified the first time this
-- runs, so current demo logins keep working. New staff signups start as
-- Pending. Review existing staff under Admin -> Staff Verification.

-- ---------------------------------------------------------------------
-- 1. STAFF VERIFICATION
-- ---------------------------------------------------------------------

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'verification_status'
    ) THEN
        -- Existing rows get 'Verified' (grandfathered); new rows default to 'Pending'.
        ALTER TABLE profiles ADD COLUMN verification_status VARCHAR(20) NOT NULL DEFAULT 'Verified'
            CHECK (verification_status IN ('Pending','Verified','Rejected'));
        ALTER TABLE profiles ALTER COLUMN verification_status SET DEFAULT 'Pending';
    END IF;
END $$;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_note TEXT;
CREATE INDEX IF NOT EXISTS idx_profiles_verification_pending ON profiles(created_at) WHERE verification_status = 'Pending';

-- New profiles: patients are verified automatically, every other role
-- starts Pending, and a signed-in user can never create an Administrator.
-- Requests without an end-user session (service-role key, SQL editor)
-- are trusted - that's how ASHA-registered patients and manual admin
-- promotion work.
CREATE OR REPLACE FUNCTION public.profiles_guard_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_role TEXT;
BEGIN
    SELECT role_name INTO v_role FROM public.roles WHERE role_id = NEW.role_id;

    IF auth.uid() IS NOT NULL THEN
        IF v_role = 'Administrator' THEN
            RAISE EXCEPTION 'Administrator accounts cannot be self-created' USING ERRCODE = '42501';
        END IF;
        NEW.verification_status := CASE WHEN v_role = 'Patient' THEN 'Verified' ELSE 'Pending' END;
        NEW.verified_by := NULL;
        NEW.verified_at := NULL;
        NEW.verification_note := NULL;
    ELSIF v_role = 'Patient' THEN
        NEW.verification_status := 'Verified';
    END IF;

    RETURN NEW;
END $$;

-- Only an administrator (or a trusted server/SQL context) may change a
-- role or any verification field. Everyone can still edit their own
-- name, phone, language, village and photo.
CREATE OR REPLACE FUNCTION public.profiles_guard_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NULL OR public.is_admin() THEN
        RETURN NEW;
    END IF;

    IF NEW.role_id IS DISTINCT FROM OLD.role_id
       OR NEW.verification_status IS DISTINCT FROM OLD.verification_status
       OR NEW.verified_by IS DISTINCT FROM OLD.verified_by
       OR NEW.verified_at IS DISTINCT FROM OLD.verified_at
       OR NEW.verification_note IS DISTINCT FROM OLD.verification_note THEN
        RAISE EXCEPTION 'Only an administrator can change a role or verification status' USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS profiles_guard_insert ON profiles;
CREATE TRIGGER profiles_guard_insert BEFORE INSERT ON profiles
    FOR EACH ROW EXECUTE FUNCTION public.profiles_guard_insert();

DROP TRIGGER IF EXISTS profiles_guard_update ON profiles;
CREATE TRIGGER profiles_guard_update BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION public.profiles_guard_update();

-- Administrators can record verification decisions on other profiles.
DROP POLICY IF EXISTS "profiles_update_admin" ON profiles;
CREATE POLICY "profiles_update_admin" ON profiles
    FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- The staff helper functions that every RLS policy relies on now return
-- NULL for an unverified account, so Pending/Rejected staff see no
-- patient data anywhere - enforced in one place, not per page.
CREATE OR REPLACE FUNCTION public.current_doctor_id()
RETURNS INT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT d.doctor_id FROM public.doctors d
  JOIN public.profiles p ON p.id = d.profile_id
  WHERE d.profile_id = auth.uid() AND p.verification_status = 'Verified'
$$;

CREATE OR REPLACE FUNCTION public.current_asha_id()
RETURNS INT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT a.asha_id FROM public.asha_workers a
  JOIN public.profiles p ON p.id = a.profile_id
  WHERE a.profile_id = auth.uid() AND p.verification_status = 'Verified'
$$;

CREATE OR REPLACE FUNCTION public.current_staff_hospital_id()
RETURNS INT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT s.hospital_id FROM public.hospital_staff s
  JOIN public.profiles p ON p.id = s.profile_id
  WHERE s.profile_id = auth.uid() AND p.verification_status = 'Verified'
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.current_lab_id()
RETURNS INT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT s.lab_id FROM public.lab_staff s
  JOIN public.profiles p ON p.id = s.profile_id
  WHERE s.profile_id = auth.uid() AND p.verification_status = 'Verified'
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.current_pharmacy_id()
RETURNS INT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT s.pharmacy_id FROM public.pharmacy_staff s
  JOIN public.profiles p ON p.id = s.profile_id
  WHERE s.profile_id = auth.uid() AND p.verification_status = 'Verified'
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.current_ambulance_id()
RETURNS INT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT a.ambulance_id FROM public.ambulances a
  JOIN public.profiles p ON p.id = a.driver_profile_id
  WHERE a.driver_profile_id = auth.uid() AND p.verification_status = 'Verified'
$$;

CREATE OR REPLACE FUNCTION public.doctor_is_verified(p_doctor_id INT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.doctors d
    JOIN public.profiles p ON p.id = d.profile_id
    WHERE d.doctor_id = p_doctor_id AND p.verification_status = 'Verified'
  )
$$;

-- ---------------------------------------------------------------------
-- 2. WALK-IN QUEUE TOKENS
-- ---------------------------------------------------------------------
-- A patient can only read their own tickets (RLS), so the old app-side
-- "max token + 1" always computed 1 and every check-in after the first
-- of the day failed. This allocates inside the database under a lock
-- per hospital and day, and returns the patient's existing token if
-- they're already in today's queue there.
CREATE OR REPLACE FUNCTION public.allocate_queue_token(p_hospital_id INT)
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_patient_id INT := public.current_patient_id();
    v_existing INT;
    v_next INT;
BEGIN
    IF v_patient_id IS NULL THEN
        RAISE EXCEPTION 'Only a signed-in patient can check in' USING ERRCODE = '42501';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.hospitals h WHERE h.hospital_id = p_hospital_id) THEN
        RAISE EXCEPTION 'Unknown hospital' USING ERRCODE = '22023';
    END IF;

    PERFORM pg_advisory_xact_lock(hashtext('queue:' || p_hospital_id || ':' || CURRENT_DATE));

    SELECT q.token_number INTO v_existing
    FROM public.queue_tickets q
    WHERE q.patient_id = v_patient_id
      AND q.hospital_id = p_hospital_id
      AND q.queue_date = CURRENT_DATE
      AND q.status IN ('Waiting','Called','InConsult')
    LIMIT 1;
    IF v_existing IS NOT NULL THEN
        RETURN v_existing;
    END IF;

    SELECT COALESCE(MAX(q.token_number), 0) + 1 INTO v_next
    FROM public.queue_tickets q
    WHERE q.hospital_id = p_hospital_id AND q.queue_date = CURRENT_DATE;

    INSERT INTO public.queue_tickets (hospital_id, patient_id, queue_date, token_number)
    VALUES (p_hospital_id, v_patient_id, CURRENT_DATE, v_next);

    RETURN v_next;
END $$;

REVOKE ALL ON FUNCTION public.allocate_queue_token(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.allocate_queue_token(INT) TO authenticated;

-- ---------------------------------------------------------------------
-- 3. APPOINTMENTS: AVAILABILITY + NO DOUBLE BOOKING
-- ---------------------------------------------------------------------

-- Booked times only (no patient information), so the slot picker sees
-- every booking, not just the current patient's own.
CREATE OR REPLACE FUNCTION public.booked_slots(p_doctor_id INT, p_date DATE)
RETURNS TABLE (slot_time TIME) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT a.appointment_time FROM public.appointments a
  WHERE a.doctor_id = p_doctor_id AND a.appointment_date = p_date AND a.status = 'Scheduled'
$$;

REVOKE ALL ON FUNCTION public.booked_slots(INT, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.booked_slots(INT, DATE) TO authenticated;

-- Patients can only book a verified doctor.
DROP POLICY IF EXISTS "appointments_insert_own_patient" ON appointments;
CREATE POLICY "appointments_insert_own_patient" ON appointments
    FOR INSERT TO authenticated
    WITH CHECK (
        patient_id = current_patient_id()
        AND booked_by_profile_id = auth.uid()
        AND doctor_is_verified(doctor_id)
    );

-- One Scheduled booking per doctor/date/time. Kept last: if duplicate
-- bookings already exist this stops with a clear message, and everything
-- above has still been applied.
DO $$
DECLARE
    dup RECORD;
BEGIN
    SELECT doctor_id, appointment_date, appointment_time, count(*) AS n INTO dup
    FROM appointments
    WHERE status = 'Scheduled'
    GROUP BY doctor_id, appointment_date, appointment_time
    HAVING count(*) > 1
    LIMIT 1;

    IF FOUND THEN
        RAISE EXCEPTION 'Cannot add the no-double-booking rule yet: doctor % already has % scheduled appointments on % at %. Set the extra ones to status = ''Cancelled'', then run this migration again.',
            dup.doctor_id, dup.n, dup.appointment_date, dup.appointment_time;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_appointments_doctor_slot_scheduled
    ON appointments (doctor_id, appointment_date, appointment_time)
    WHERE status = 'Scheduled';
