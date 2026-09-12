# Swasthsetu — Rural Health Platform

A centralized, multilingual, offline-tolerant platform connecting rural
patients, ASHA workers, doctors, PHCs/hospitals, labs, pharmacies,
ambulance services, and district administrators — built for SIH 2026 PS
SIH26133 ("Accessibility and quality of public healthcare services,
particularly in rural and underserved areas", Govt. of Maharashtra).

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Environment variables**

   Copy `.env.local.example` to `.env.local` and fill in real values:

   ```bash
   cp .env.local.example .env.local
   ```

   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — from your Supabase project settings.
   - `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` — from your Cloudinary dashboard. The key/secret are server-only; never put them in a `NEXT_PUBLIC_*` variable.
   - `SUPABASE_SERVICE_ROLE_KEY` — **required** (not optional): ASHA-assisted patient registration, reminder dispatch, the SMS/USSD/IVR webhooks and the Public Health Index use it server-side. Supabase dashboard → Settings → API → `service_role` key.
   - `PHI_ENCRYPTION_KEY` — **required**: encrypts patient health information before it is stored. Generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` and keep a backup — encrypted records are unreadable without it.
   - `ANTHROPIC_API_KEY` — enables the AI symptom checker (web, voice, SMS, phone line). Without it triage falls back to the rule-based engine.
   - `SMS_PROVIDER=twilio` + `TWILIO_*`, `PUBLIC_APP_URL`, `TELECOM_WEBHOOK_SECRET`, `CRON_SECRET` — keypad-phone channels and reminder delivery. See `.env.local.example` for what each does; without them SMS/voice calls are simulated and logged.

3. **Run the database schema**

   Open your Supabase project → SQL Editor:
   1. Paste the contents of `supabase/schema.sql` → Run (Phase 1 tables, safe to re-run - destructive, only for a project with no real data yet).
   2. Paste the contents of `supabase/migrations/002_phase2_to_6.sql` → Run (Phases 2-6: ASHA, triage/queue, referrals, ambulance, lab, pharmacy, admin/reminders/schemes/feedback, i18n seed data — additive, safe to re-run).
   3. Paste the contents of `supabase/migrations/003_ai_triage_voice_sms_phi.sql` → Run (AI triage columns, voice consult mode, SMS/USSD/IVR message log, PHI column widening + audit policies, teleconsult RLS fix — additive, safe to re-run).
   4. Paste the contents of `supabase/migrations/004_high_priority_fixes.sql` → Run (staff verification with admin approval, protection against self-assigned roles, reliable walk-in queue tokens, no double booking — additive, safe to re-run). Existing accounts are kept as verified; new staff signups wait for approval under **Admin → Staff Verification**.

4. **Disable email confirmation (prototype simplification)**

   Supabase dashboard → Authentication → Providers → Email → turn OFF "Confirm email".
   Without this, signup won't get an active session until the user clicks a confirmation
   link, and the app doesn't have that flow yet. Turn it back on before any real deployment.

5. **Promote one account to Administrator (optional)**

   Sign up normally through the app (any role), then run the commented-out
   `UPDATE profiles ...` statement at the bottom of
   `supabase/migrations/002_phase2_to_6.sql`, with your email filled in.

6. **Run the app**

   ```bash
   npm run dev
   ```

   Visit `http://localhost:3000`. Sign up as a Patient and a Doctor to
   try the Phase 1 flow, or as an ASHA Worker / Hospital Staff / Lab
   Staff / Pharmacy Staff / Ambulance Provider to try the newer
   modules — each of those finishes with a short onboarding step
   (pick your village/hospital/lab/pharmacy/vehicle) before landing on
   its dashboard.

## What's built

- **Auth & roles**: email/password auth, 8 roles, role-aware routing and
  route protection (`proxy.ts`), Hindi/English UI toggle.
- **Patient**: dashboard, appointment booking, digital symptom triage,
  walk-in queue check-in/status, one-tap emergency ambulance request,
  bilingual health-scheme browser, medicine-availability search,
  feedback, FHIR-shaped health-record export.
- **ASHA Worker**: assisted patient registration (works for patients with
  no email/device), offline-tolerant field-visit logging, village/
  hospital directory, assisted triage.
- **Doctor**: availability, consult flow (diagnosis + prescription +
  referral + lab order), embedded video teleconsult.
- **Hospital Staff**: walk-in queue front desk, referral inbox, feedback
  review.
- **Lab Staff**: order queue, result upload via Cloudinary.
- **Pharmacy Staff**: stock management.
- **Ambulance Provider**: request board, accept/dispatch/complete.
- **Administrator**: district-level aggregate dashboard, health-scheme
  CRUD, feedback resolution.
- **Cloudinary**: signed server-side uploads (secret never reaches the browser).
- **Supabase**: Auth-integrated schema, RLS policies on every table.
- **AI symptom triage**: Claude assesses checked symptoms plus the
  patient's own words (typed, spoken, SMS or phone call) into Low /
  Medium / High / Emergency with likely minor causes, home-care advice and
  red flags — in English, Hindi or Gujarati. A rule-based check can only
  raise urgency, and takes over when the AI is unavailable. Emergency
  results go straight to the emergency page.
- **Voice**: speak symptoms, hear results read aloud, and a hands-free
  voice SOS that requests an ambulance on hearing "help" / "bachao".
- **Keypad phones & rural areas**: SMS commands (`SOS`, `CHECK <symptoms>`,
  `APPT`, `STATUS`), a USSD menu, and an IVR voice line with spoken AI
  triage — all at `/api/sms/inbound`, `/api/ussd`, `/api/ivr/voice`.
  SMS/voice-call reminders and emergency-contact alerts.
- **Voice & video consultation**: book in person, video, or audio-only
  voice consult (for weak networks; doctor can also phone the patient).
- **PHI security**: AES-256-GCM encryption of clinical data, contact
  details and messages at rest, plus a PHI access audit log.
- **Public Health Index**: district scores for emergency response,
  appointments, referrals, vaccination, medicines and satisfaction —
  admin view and a de-identified public JSON feed
  (`/api/public-health-index`).

See `progress.md` for the full architecture decisions, phase roadmap,
and what's intentionally still out of scope. See `DOCUMENTATION.md` for the
full technical reference — every technology used and exactly where in the
codebase it lives (tech stack, database schema, RLS model, feature map by
role, i18n, teleconsult, triage engine, uploads, API routes, env vars).
