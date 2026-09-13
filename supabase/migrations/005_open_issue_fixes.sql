-- =====================================================================
-- SWASTHSETU - Migration 005: open-issue fixes
-- =====================================================================
--   1. Ambulance dispatch - drivers could not see (let alone accept) an
--      unassigned request, because RLS only showed a row to the
--      requester, the patient, an admin or an already-assigned
--      ambulance. Adds a scoped SELECT arm for open requests plus an
--      atomic "claim" function so two drivers can't take the same one.
--   2. Consultations - one SECURITY DEFINER function writes the record,
--      prescription, referral, lab order and appointment status in a
--      single transaction, so a failure halfway through no longer
--      leaves a half-saved consultation behind.
--   3. Offline field visits - a client-generated reference makes a
--      retried sync idempotent instead of inserting the visit twice.
--   4. Phone numbers - every signed-in user could read every profile's
--      phone number. The column is taken out of the `authenticated`
--      grant and served by a function that answers only for people with
--      a care relationship to that profile.
--
-- Run after 004. Additive and safe to paste more than once.
-- HOW TO RUN: Supabase dashboard -> SQL Editor -> paste this file -> Run.

-- 004 introduced profiles.verification_status and the verified-staff
-- helpers this migration builds on. Stop with a readable message rather
-- than a confusing "column does not exist" halfway down.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'verification_status'
    ) THEN
        RAISE EXCEPTION 'Run supabase/migrations/004_high_priority_fixes.sql first - this migration builds on staff verification.';
    END IF;
END $$;


-- ---------------------------------------------------------------------
-- 1. AMBULANCE DISPATCH
-- ---------------------------------------------------------------------

-- The district an on-duty driver covers (NULL when the caller isn't a
-- verified ambulance account - current_ambulance_id() already returns
-- NULL for Pending/Rejected staff, see 004).
CREATE OR REPLACE FUNCTION public.current_ambulance_district_id()
RETURNS INT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT a.district_id FROM public.ambulances a
  WHERE a.ambulance_id = public.current_ambulance_id()
$$;

-- Is this unassigned request one the signed-in driver should see?
--
-- Takes the row's columns as arguments rather than reading
-- ambulance_requests itself, so it can be called from that table's own
-- SELECT policy without recursing into it.
--
-- Scoped to the driver's district, derived from the destination
-- hospital or (failing that) the patient's village. A request whose
-- district can't be worked out - an SOS from a keypad phone with no
-- patient record, say - stays visible to every on-duty driver: an
-- emergency must never be invisible because a village wasn't filled in.
CREATE OR REPLACE FUNCTION public.ambulance_request_is_open_to_driver(
    p_status TEXT,
    p_ambulance_id INT,
    p_patient_id INT,
    p_destination_hospital_id INT
)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_driver_district INT;
    v_request_district INT;
BEGIN
    IF p_status <> 'Requested' OR p_ambulance_id IS NOT NULL THEN
        RETURN FALSE;
    END IF;

    v_driver_district := public.current_ambulance_district_id();
    IF v_driver_district IS NULL THEN
        RETURN FALSE;
    END IF;

    SELECT h.district_id INTO v_request_district
    FROM public.hospitals h WHERE h.hospital_id = p_destination_hospital_id;

    IF v_request_district IS NULL THEN
        SELECT v.district_id INTO v_request_district
        FROM public.patients pt
        JOIN public.profiles pr ON pr.id = pt.profile_id
        JOIN public.villages v ON v.village_id = pr.village_id
        WHERE pt.patient_id = p_patient_id;
    END IF;

    RETURN v_request_district IS NULL OR v_request_district = v_driver_district;
END $$;

REVOKE ALL ON FUNCTION public.ambulance_request_is_open_to_driver(TEXT, INT, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ambulance_request_is_open_to_driver(TEXT, INT, INT, INT) TO authenticated;
REVOKE ALL ON FUNCTION public.current_ambulance_district_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_ambulance_district_id() TO authenticated;

DROP POLICY IF EXISTS "ambulance_requests_select" ON ambulance_requests;
CREATE POLICY "ambulance_requests_select" ON ambulance_requests
    FOR SELECT TO authenticated
    USING (
        requested_by_profile_id = auth.uid()
        OR patient_id = current_patient_id()
        OR ambulance_id = current_ambulance_id()
        OR is_admin()
        OR ambulance_request_is_open_to_driver(status, ambulance_id, patient_id, destination_hospital_id)
    );

-- The old UPDATE policy had no WITH CHECK, so anyone who could update a
-- row could hand it to a different ambulance (or blank the assignment).
-- Claiming deliberately isn't possible through this policy at all - it
-- goes through claim_ambulance_request() below, which is atomic.
DROP POLICY IF EXISTS "ambulance_requests_update_involved" ON ambulance_requests;
CREATE POLICY "ambulance_requests_update_involved" ON ambulance_requests
    FOR UPDATE TO authenticated
    USING (requested_by_profile_id = auth.uid() OR ambulance_id = current_ambulance_id() OR is_admin())
    WITH CHECK (requested_by_profile_id = auth.uid() OR ambulance_id = current_ambulance_id() OR is_admin());

-- Accepting a request, atomically. The UPDATE's own WHERE clause is the
-- lock: whichever driver's statement lands first sets ambulance_id, and
-- the second one matches no row and is told the request is already
-- taken, instead of silently overwriting the first driver's dispatch.
CREATE OR REPLACE FUNCTION public.claim_ambulance_request(p_request_id INT)
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_ambulance_id INT := public.current_ambulance_id();
    v_claimed INT;
BEGIN
    IF v_ambulance_id IS NULL THEN
        RAISE EXCEPTION 'Only a verified ambulance account can accept a request' USING ERRCODE = '42501';
    END IF;

    UPDATE public.ambulance_requests
    SET ambulance_id = v_ambulance_id,
        status = 'Dispatched',
        dispatched_at = now()
    WHERE request_id = p_request_id
      AND ambulance_id IS NULL
      AND status = 'Requested'
    RETURNING request_id INTO v_claimed;

    IF v_claimed IS NULL THEN
        RAISE EXCEPTION 'This request has already been taken by another ambulance' USING ERRCODE = '55000';
    END IF;

    UPDATE public.ambulances SET is_available = FALSE WHERE ambulance_id = v_ambulance_id;

    RETURN v_claimed;
END $$;

REVOKE ALL ON FUNCTION public.claim_ambulance_request(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_ambulance_request(INT) TO authenticated;

-- Drivers sort the board by how long someone has been waiting.
CREATE INDEX IF NOT EXISTS idx_ambulance_requests_open
    ON ambulance_requests (requested_at)
    WHERE status = 'Requested' AND ambulance_id IS NULL;


-- ---------------------------------------------------------------------
-- 2. CONSULTATIONS IN ONE TRANSACTION
-- ---------------------------------------------------------------------
-- Saving a consultation used to be five separate PostgREST calls, each
-- its own transaction: a failure at the prescription step left an
-- orphan medical record, and a failure at the end left the appointment
-- stuck on Scheduled with a record already written. One function = one
-- transaction, so it either all lands or none of it does.
--
-- PHI (diagnosis, symptoms, notes) arrives already encrypted by
-- lib/phi-crypto.ts - this function stores whatever string it is given
-- and never decrypts anything.
CREATE OR REPLACE FUNCTION public.record_consultation(
    p_appointment_id INT,
    p_diagnosis TEXT DEFAULT NULL,
    p_symptoms TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_items JSONB DEFAULT '[]'::jsonb,
    p_refer_hospital_id INT DEFAULT NULL,
    p_refer_reason TEXT DEFAULT NULL,
    p_refer_urgency TEXT DEFAULT 'Normal',
    p_lab_id INT DEFAULT NULL,
    p_test_id INT DEFAULT NULL
)
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_doctor_id INT := public.current_doctor_id();
    v_patient_id INT;
    v_record_id INT;
    v_prescription_id INT;
    v_from_hospital_id INT;
BEGIN
    IF v_doctor_id IS NULL THEN
        RAISE EXCEPTION 'Only a verified doctor can record a consultation' USING ERRCODE = '42501';
    END IF;

    SELECT a.patient_id INTO v_patient_id
    FROM public.appointments a
    WHERE a.appointment_id = p_appointment_id AND a.doctor_id = v_doctor_id;

    IF v_patient_id IS NULL THEN
        RAISE EXCEPTION 'Appointment not found' USING ERRCODE = '42501';
    END IF;

    INSERT INTO public.medical_records (patient_id, appointment_id, doctor_id, diagnosis, symptoms, notes)
    VALUES (v_patient_id, p_appointment_id, v_doctor_id, p_diagnosis, p_symptoms, p_notes)
    RETURNING record_id INTO v_record_id;

    IF jsonb_array_length(COALESCE(p_items, '[]'::jsonb)) > 0 THEN
        INSERT INTO public.prescriptions (record_id, doctor_id, patient_id)
        VALUES (v_record_id, v_doctor_id, v_patient_id)
        RETURNING prescription_id INTO v_prescription_id;

        INSERT INTO public.prescription_items (prescription_id, medicine_name, dosage, duration_days, instructions)
        SELECT v_prescription_id,
               item->>'medicineName',
               NULLIF(item->>'dosage', ''),
               NULLIF(item->>'durationDays', '')::INT,
               NULLIF(item->>'instructions', '')
        FROM jsonb_array_elements(p_items) AS item
        WHERE COALESCE(item->>'medicineName', '') <> '';
    END IF;

    IF p_refer_hospital_id IS NOT NULL THEN
        SELECT d.primary_hospital_id INTO v_from_hospital_id
        FROM public.doctors d WHERE d.doctor_id = v_doctor_id;

        INSERT INTO public.referrals (
            patient_id, referred_from_hospital_id, referred_to_hospital_id,
            referred_by_doctor_id, reason, urgency_level
        )
        VALUES (
            v_patient_id, v_from_hospital_id, p_refer_hospital_id,
            v_doctor_id, NULLIF(p_refer_reason, ''), COALESCE(NULLIF(p_refer_urgency, ''), 'Normal')
        );
    END IF;

    IF p_lab_id IS NOT NULL AND p_test_id IS NOT NULL THEN
        INSERT INTO public.lab_test_orders (record_id, patient_id, lab_id, test_id, ordered_by_doctor_id)
        VALUES (v_record_id, v_patient_id, p_lab_id, p_test_id, v_doctor_id);
    END IF;

    UPDATE public.appointments SET status = 'Completed' WHERE appointment_id = p_appointment_id;

    RETURN v_record_id;
END $$;

REVOKE ALL ON FUNCTION public.record_consultation(INT, TEXT, TEXT, TEXT, JSONB, INT, TEXT, TEXT, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_consultation(INT, TEXT, TEXT, TEXT, JSONB, INT, TEXT, TEXT, INT, INT) TO authenticated;


-- ---------------------------------------------------------------------
-- 3. OFFLINE FIELD VISITS: IDEMPOTENT SYNC
-- ---------------------------------------------------------------------
-- An ASHA's queued visit carries a reference generated on her phone. If
-- a sync is retried - flaky village network, the response lost on the
-- way back, the same queue flushed twice - the second insert hits this
-- unique index and is ignored instead of logging the visit again.
-- NULL references (visits typed in while online) never collide.
ALTER TABLE asha_field_visits ADD COLUMN IF NOT EXISTS client_ref UUID;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_asha_field_visits_client_ref
    ON asha_field_visits (asha_id, client_ref);


-- ---------------------------------------------------------------------
-- 4. PHONE NUMBERS ARE NOT PUBLIC
-- ---------------------------------------------------------------------
-- profiles rows stay readable by any signed-in user (the app needs
-- names and photos for doctors, patients, ASHAs and staff across the
-- whole platform), but a phone number is contact data that only people
-- with a care relationship should get. RLS is row-level, so this is
-- done with a column grant: `authenticated` keeps SELECT on every
-- column except phone_number, which is served by profile_phone() below.
--
-- Built from information_schema rather than a hardcoded list so that
-- re-running it after an earlier migration is safe. NOTE for future
-- migrations: a new profiles column needs this block re-run (just paste
-- this file again) before clients can select it.
DO $$
DECLARE
    v_columns TEXT;
BEGIN
    SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position) INTO v_columns
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name <> 'phone_number';

    EXECUTE 'REVOKE SELECT ON public.profiles FROM authenticated';
    EXECUTE format('GRANT SELECT (%s) ON public.profiles TO authenticated', v_columns);
END $$;

-- Who may read a phone number: the owner, an administrator, a doctor
-- treating that patient, the ASHA who registered them, and the driver
-- of an ambulance currently dispatched to them (they have to be able to
-- ring the house to find it).
CREATE OR REPLACE FUNCTION public.profile_phone(p_profile_id UUID)
RETURNS TEXT LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_patient_id INT;
    v_allowed BOOLEAN := FALSE;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN NULL;
    END IF;

    IF p_profile_id = auth.uid() OR public.is_admin() THEN
        v_allowed := TRUE;
    ELSE
        SELECT pt.patient_id INTO v_patient_id
        FROM public.patients pt WHERE pt.profile_id = p_profile_id;

        IF v_patient_id IS NOT NULL THEN
            v_allowed :=
                EXISTS (
                    SELECT 1 FROM public.appointments a
                    WHERE a.patient_id = v_patient_id AND a.doctor_id = public.current_doctor_id()
                )
                OR EXISTS (
                    SELECT 1 FROM public.patients pt2
                    WHERE pt2.patient_id = v_patient_id
                      AND pt2.registered_by_asha_id = public.current_asha_id()
                )
                OR EXISTS (
                    SELECT 1 FROM public.ambulance_requests r
                    WHERE r.patient_id = v_patient_id
                      AND r.ambulance_id = public.current_ambulance_id()
                      AND r.status = 'Dispatched'
                );
        END IF;
    END IF;

    IF NOT v_allowed THEN
        RETURN NULL;
    END IF;

    RETURN (SELECT p.phone_number FROM public.profiles p WHERE p.id = p_profile_id);
END $$;

REVOKE ALL ON FUNCTION public.profile_phone(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.profile_phone(UUID) TO authenticated;
