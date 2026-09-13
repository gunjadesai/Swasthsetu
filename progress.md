# Rural Healthcare Accessibility Platform — Project Tracker

This file is the single source of truth for the build. Read this first in
any new session before writing code. Update it whenever a phase finishes
or a real decision gets made - not for routine in-phase edits.

---

## 1. Overview

A centralized, multilingual, offline-tolerant platform connecting rural
patients, ASHA workers, doctors, PHCs/hospitals, labs, pharmacies,
ambulance services, and district administrators — built for the SIH
problem statement "Accessibility and Quality of Public Healthcare
Services, Particularly in Rural and Underserved Areas."

## 2. Tech Stack

| Layer            | Choice                                                        |
|------------------|----------------------------------------------------------------|
| Frontend         | Next.js 15 (App Router), TypeScript, Tailwind CSS, hand-rolled UI primitives |
| Backend / DB     | Supabase (Postgres + Auth + Row Level Security)                |
| Media storage    | Cloudinary (signed, server-side uploads only)                  |
| Data fetching    | Server Components + Server Actions (no client data-fetching library needed yet) |
| Forms/validation | Native forms + `useActionState`, Zod validation server-side     |
| i18n             | Custom (Hindi + English) - see Decisions Log, not next-intl      |
| Hosting          | Vercel (app) + Supabase Cloud (DB/auth) — assumed               |

## 3. Architecture Decisions

- **Auth**: Supabase Auth (`auth.users`) + `public.profiles` (1:1, UUID).
  Every domain table references `profiles.id`, not a custom `users` table.
- **Images**: Cloudinary only, via a signed server route
  (`/api/cloudinary/sign`). Browser never sees the API secret.
- **Attachments**: a generic `attachments` table exists for future
  multi-image needs (lab scans, etc). Profile photo uses dedicated
  `profiles.avatar_url` / `avatar_cloudinary_public_id` columns for speed.
- **RLS**: enabled on every table. As of Phase 2-6
  (`supabase/migrations/002_phase2_to_6.sql`), every table in the
  original schema now has real policies - nothing is RLS-locked with no
  policy anymore. New tables (`triage_assessments`, `queue_tickets`,
  `lab_staff`, `pharmacy_staff`) follow the same pattern: SECURITY
  DEFINER helper functions (`current_asha_id()`, `current_lab_id()`,
  `current_pharmacy_id()`, `current_ambulance_id()`,
  `current_staff_hospital_id()`, `is_admin()`) scoped to `auth.uid()`,
  used throughout.
- **Signup flow simplification**: Supabase "Confirm email" must be
  turned off for Phase 1 (see README) so signup gets an active session
  immediately. This is flagged, not hidden - re-enable + add a real
  confirmation flow before production.
- **Booking logic**: doctor sets recurring weekly availability blocks
  (`doctor_availability`); available slots are computed at request time
  by subtracting already-booked appointment times, and past times are
  excluded for same-day bookings.
- **Role onboarding**: ASHA/HospitalStaff/LabStaff/PharmacyStaff/
  AmbulanceProvider signup is two steps - `app/signup` creates the
  account, then a role-specific `/<role>/onboarding` page (reached only
  once authenticated) picks the village/hospital/lab/pharmacy/vehicle,
  because the lookup tables' RLS policies are `authenticated`-only, not
  `anon`. Administrator has no self-serve signup at all - promoted
  manually via the SQL snippet in migration 002, section 9.
- **ASHA-assisted patient registration** uses `lib/supabase/admin.ts`
  (service-role key) to call `auth.admin.createUser()` for patients with
  no email/device of their own, synthesizing a placeholder
  `<phone>@asha.rural-health.local` address. Documented shortcut, same
  spirit as the "Confirm email off" one above.
- **i18n**: a lightweight custom dictionary (`lib/i18n/`), not
  `next-intl` as originally planned - avoids restructuring every route
  under `/[locale]/...`. `NEXT_LOCALE` cookie + `getDictionary()`
  (server) / `useTranslation()` (client) + `LanguageSwitcher`. Covers
  nav, landing/auth, and the triage/emergency/schemes flows; not every
  string in the app yet.
- **Digital triage** is AI-first with a rule-based safety floor
  (migration 003). `lib/ai-triage.ts` sends the checked symptoms plus the
  person's own words (typed, spoken, SMS or phone-call transcript) to
  Gemini (`gemini-flash-lite-latest`, structured output via
  `responseSchema` + Zod validation) and gets back urgency, next action,
  likely minor causes, safe home-care advice and red flags in the
  patient's language. Originally built against Claude
  (`claude-opus-5`) - switched to Gemini for a free/cheap-tier option;
  the heavier `gemini-flash-latest` alias returned a consistent 503
  "high demand" on this project's free-tier key when tested directly,
  the lite tier didn't, so lite is what's actually used, not a
  convenience downgrade. The weighted checklist in `lib/triage.ts` (now
  with en/hi/gu/Hinglish keywords) always runs too: final urgency is the
  higher of the two, so rules can escalate the AI but never downgrade
  it. No API key, a timeout, or an invalid response -> rules alone
  (`engine = 'Rules'`). Web/Voice get a 45s timeout with 2 retries on a
  transient 503; SMS/IVR get a 9s timeout with no retries (Twilio drops
  webhooks at 15s); USSD is rules-only.
- **Emergency redirect**: an Emergency triage result never renders a
  result card - the server action `redirect()`s to `/patient/emergency`
  (or the new `/asha/emergency`) with the triage attached, which shows why
  it was flagged and what to do while waiting.
- **Voice**: in the browser, Web Speech API (`lib/voice/use-speech.ts`,
  en-IN/hi-IN/gu-IN) for symptom dictation, read-aloud results and a
  hands-free voice SOS on the emergency page that sends the ambulance
  request the moment it hears "help / bachao / ambulance" or an emergency
  symptom. For keypad phones, a Twilio voice line (`/api/ivr/voice`,
  `/api/ivr/gather`): press or say, AI triage of the spoken description,
  ambulance on confirmation.
- **Teleconsult**: embedded Jitsi (`meet.jit.si`) rooms, generated
  per-appointment, no vendor key needed. Appointments now have three
  modes - InPerson, Teleconsult (video) and VoiceConsult (audio-only Jitsi
  config for weak networks, plus a `tel:` fallback for the doctor).
  `teleconsult_sessions` had no RLS policy before migration 003, so room
  creation from a user session was blocked - fixed there.
- **PHI encryption**: `lib/phi-crypto.ts`, AES-256-GCM with
  `PHI_ENCRYPTION_KEY`, format `enc:v1:iv:tag:ciphertext`; values without
  the prefix pass through as legacy plaintext. Encrypted: medical record
  diagnosis/symptoms/notes, triage free text + AI assessment, patient
  address + emergency contact, ambulance caller notes, SMS/IVR bodies.
  Decrypt only on the server. PHI views/exports are written to
  `audit_logs` (`lib/audit.ts`). A missing key blocks clinical writes with
  a clear error - except ambulance requests, which drop the note instead.
- **SMS / USSD / IVR for keypad phones**: `lib/telecom/`. Callers are
  identified only by phone number (`profiles.phone_last10` generated
  column). Webhooks verify `X-Twilio-Signature` or a shared
  `TELECOM_WEBHOOK_SECRET` and return 503 when neither is configured.
  Outbound via Twilio REST when `SMS_PROVIDER=twilio`, otherwise
  simulated and logged as such. Every message is logged to `sms_messages`
  (encrypted body). Ambulance requests from any channel SMS the patient's
  emergency contact. Indian A2P SMS additionally needs DLT templates - a
  DLT gateway (MSG91/Gupshup/Exotel) slots in next to `sendViaTwilio`.
- **Public Health Index**: `lib/health-index.ts` - six 0-100 district
  indicators (emergency response, appointment completion, referral
  follow-through, vaccination coverage, medicine availability, patient
  satisfaction) over 90 days, composite = mean of indicators with >= 5
  records. Admin view at `/admin/health-index`; open JSON feed at
  `/api/public-health-index` with small-cell (<5) suppression.
- **Interoperability**: `/api/fhir/patient/[patientId]/summary` returns
  a FHIR R4-shaped Bundle built from existing tables, RLS-respecting.
  Not a certified ABDM/ABHA integration (needs an org registration this
  project doesn't have) - an honest architecture answer, not an
  overclaim.
- **Offline tolerance**: a generic, reusable offline-sync layer
  (`lib/offline-sync/`: a localStorage-backed queue factory + a
  `useOfflineSync` hook) queues entries when offline, synced via a
  "Sync now" button or automatically on the `online` event. No new
  dependency (not IndexedDB) - the records are small text, no blobs.
  ASHA field-visit logging (`app/asha/(app)/visits/`) is the first
  consumer; any future offline-capable flow (digital triage
  submissions, queue-ticket check-ins) plugs into the same hook
  instead of re-implementing the localStorage/online-listener
  plumbing.
- **SMS/IVR reminders**: `reminders.channel = 'App'` is fully delivered
  (notification bell); `'SMS'`/`'IVR'` rows are marked `Failed` with a
  reason by `/api/reminders/dispatch` until a telecom provider
  (Twilio/MSG91/etc.) key is supplied - same category of gap as the
  missing `CLOUDINARY_CLOUD_NAME` below.

## 4. Decisions Log

- Phase 1 fully builds: **Patient + Doctor** (not ASHA, not Admin - those
  come later).
- Login method: **email + password** (phone/OTP deferred).
- Codebase: **fresh Next.js project** (no existing repo to integrate with).
- Design direction: deep teal (`#0F4C46`) + warm marigold accent
  (`#D9A441`) on a soft warm-grey field, IBM Plex Sans throughout (chosen
  partly for its Devanagari companion cut, ahead of Phase 6 multilingual
  work). Flat surfaces with hairline borders instead of card shadows.
- Phases 2-6 built in one pass, targeting SIH 2026 PS SIH26133
  ("Accessibility and quality of public healthcare services... rural and
  underserved areas", Govt. of Maharashtra) - see the Architecture
  Decisions above for the specific calls made (i18n approach, triage
  model, teleconsult vendor, interoperability scope, offline strategy,
  reminder delivery). Full rationale in the plan this was built from.
- New self-serve roles: ASHAWorker, HospitalStaff, LabStaff,
  PharmacyStaff, AmbulanceProvider (Administrator stays manual-promote
  only). `lib/types.ts` `RoleName`/`SelfServeRoleName`,
  `proxy.ts`'s (formerly `middleware.ts`) `ROLE_HOME` map, and `app/signup` all updated
  together.
- Digital triage and walk-in queue management are new concepts not in
  the original schema - added via `triage_assessments` and
  `queue_tickets` (migration 002) because the official PS text calls
  for both explicitly and neither existed yet.
- Seed data for a sample Maharashtra directory (Palghar/Gadchiroli
  districts, one PHC, one district hospital, one lab, one pharmacy) is
  included in migration 002 so signup/onboarding dropdowns aren't empty
  on a fresh project - replace/expand with real facilities before any
  real deployment.

## 5. Environment Variables Needed

| Variable                              | Status                          |
|----------------------------------------|----------------------------------|
| `NEXT_PUBLIC_SUPABASE_URL`             | ✅ have it                       |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | ✅ have it                       |
| `SUPABASE_SERVICE_ROLE_KEY`            | ✅ have it - ASHA registration + reminder dispatch |
| `CLOUDINARY_CLOUD_NAME`                | ✅ have it |
| `CLOUDINARY_API_KEY`                   | ✅ have it (server-only)         |
| `CLOUDINARY_API_SECRET`                | ✅ have it (server-only)         |
| `PHI_ENCRYPTION_KEY`                   | ✅ have it (migration 003) - clinical writes fail with a clear error until set |
| `GEMINI_API_KEY`                       | ✅ have it - AI triage (`gemini-flash-lite-latest`); rule-based fallback until set |
| `SMS_PROVIDER` + `TWILIO_*`            | ❌ optional - SMS/voice calls are simulated until set |
| `TELECOM_WEBHOOK_SECRET` / `PUBLIC_APP_URL` | ❌ needed before exposing `/api/sms`, `/api/ussd`, `/api/ivr` |
| `CRON_SECRET`                          | ❌ recommended - protects `/api/reminders/dispatch` |

## 6. Phase Roadmap

- [x] **Phase 1 — Foundation, Auth, Patient + Doctor**
  Next.js scaffold, Tailwind design system, Supabase-adapted schema + RLS,
  signup/login/logout, role-aware protected routing, patient dashboard +
  booking + appointment history + profile, doctor dashboard + availability
  + appointment consult flow + profile, Cloudinary avatar upload.
  **Status: code complete, not yet run against a live Supabase project.**
  Remaining before it's actually "done": run `supabase/schema.sql`,
  disable email confirmation, supply `CLOUDINARY_CLOUD_NAME`, `npm install`
  + smoke test both roles end to end.

- [x] **Phase 2 — ASHA Worker**
  ASHA onboarding + dashboard, assisted patient registration (service-role
  `auth.admin.createUser`), offline-tolerant field-visit logging
  (`localStorage` queue + sync), village/hospital directory & search,
  ASHA-assisted digital triage. RLS policies for `asha_workers` /
  `asha_field_visits` / `maternal_child_health_records` /
  `vaccination_records`.
  **Status: code complete, not yet smoke-tested against a live Supabase
  project with migration 002 applied.**

- [x] **Phase 3 — Lab & Pharmacy**
  Lab test ordering from the doctor consult flow, lab staff dashboard
  (mark sample collected, upload result via Cloudinary + `attachments`,
  mark ready), pharmacy staff stock management, patient-facing medicine
  search. RLS for `lab_staff`/`pharmacy_staff` (new tables) and the
  previously-locked `laboratories`/`lab_test_catalog`/`lab_test_orders`/
  `pharmacies`/`medicine_catalog`/`medicine_availability`.

- [x] **Phase 4 — Ambulance & Referrals + digital triage/queue**
  Referral creation from the doctor consult flow, hospital referral
  inbox (accept/complete), patient one-tap emergency ambulance request
  with geolocation, ambulance provider dashboard (accept/dispatch/
  complete, availability toggle). Digital triage (`triage_assessments`,
  rule-based) and walk-in queue management (`queue_tickets`, hospital
  front-desk board + patient live-token view) - both new tables, not in
  the original schema, added because the official PS asks for them
  explicitly.

- [x] **Phase 5 — Admin, reporting, reminders & feedback**
  Admin dashboard (district-level aggregate counts), health-scheme CRUD
  (bilingual) + patient-facing bilingual scheme browser, feedback
  submission + hospital/admin resolution queues, in-app reminders
  (notification bell) fully working, `/api/reminders/dispatch` route
  (SMS/IVR stay `Failed` with a reason until a telecom provider key is
  supplied).

- [x] **Phase 6 — Multilingual, offline-first, real teleconsult,
  interoperability**
  Hindi + English UI (custom dictionary, not next-intl - see Decisions
  Log), offline capture + sync queue for the ASHA field-visit flow, real
  embedded-Jitsi teleconsult (patient + doctor sides), FHIR-shaped
  health-record export. Accessibility pass and deployment hardening are
  still outstanding.

- [x] **Phase 7 — AI triage, voice, keypad-phone channels, PHI security,
  Public Health Index** (`supabase/migrations/003_ai_triage_voice_sms_phi.sql`)
  Claude-powered symptom triage with a rule-based safety floor; Emergency
  results redirect straight to the emergency page (patient and new ASHA
  page). Browser voice: dictation, read-aloud, hands-free voice SOS.
  Keypad phones: SMS commands (`/api/sms/inbound`), USSD menu
  (`/api/ussd`), IVR voice line with spoken AI triage (`/api/ivr/*`),
  SMS/voice-call reminders, emergency-contact SMS on every ambulance
  request. Voice consult (audio-only) alongside video consult at booking.
  AES-256-GCM PHI encryption + PHI access audit log. District Public
  Health Index (admin page + suppressed public JSON feed).
  **Status: code complete and type-checks; not yet run against a live
  Supabase project with migration 003, real Gemini key, or a Twilio
  number.**

- [x] **Phase 8 — High-priority fixes + dark mode**
  (`supabase/migrations/004_high_priority_fixes.sql`)
  Staff verification: every non-patient signup starts Pending; the staff
  RLS helpers (`current_doctor_id()`, `current_asha_id()`, ...) return NULL
  until an administrator approves the account at `/admin/verifications`,
  so unverified staff see no patient data anywhere. Profile triggers stop
  users changing their own role/verification and block self-created
  Administrators. Walk-in queue tokens come from `allocate_queue_token()`
  (advisory lock per hospital/day). Booking: `booked_slots()` so
  availability sees every patient's bookings, a server-side slot re-check,
  a unique index on Scheduled doctor/date/time, and verified doctors only.
  The app falls back to the old behaviour until 004 is run.
  Site-wide dark mode: colour tokens are CSS variables (light palette
  unchanged), `ThemeToggle` (light/dark/system, `NEXT_THEME` cookie, no
  flash on load). Symptom checker shows which symptoms it recognised and
  says "not assessed" instead of a false Low when the AI is unavailable.
  **Status: type-checks and builds; migration 004 not yet run. Offline
  sync issues from the audit deliberately left for later.**

- [x] **Phase 9 — Open-issue clearance**
  (`supabase/migrations/005_open_issue_fixes.sql`)
  *Ambulance dispatch (was the critical one):* a scoped SELECT arm lets a
  verified, on-duty driver see unassigned requests in their district
  (district derived from the destination hospital or the patient's
  village; an undetermined district stays visible to every on-duty
  driver, because an emergency must never be invisible), and
  `claim_ambulance_request()` claims one in a single atomic statement -
  the second driver to tap Accept is told it's taken instead of silently
  stealing the dispatch. The update policy gained the `WITH CHECK` it
  never had.
  *Reminder dispatch:* `CRON_SECRET` is now required - `503` when unset
  instead of an open service-role endpoint (`lib/cron-auth.ts`).
  *Offline sync:* queues are namespaced per signed-in profile, notes are
  encrypted under a non-extractable device key (Web Crypto + IndexedDB),
  every entry carries an idempotency key enforced by a unique index, a
  failed storage write is reported instead of a false "saved", the queue
  auto-flushes on page load as well as on `online`, one bad entry no
  longer blocks the batch, and a sync that hangs times out. A minimal
  service worker keeps the shell loadable and serves `/offline`
  (four languages, "call 108") - build assets only, never a signed-in
  page or an API response.
  *Consultations:* `record_consultation()` writes record, prescription,
  items, referral, lab order and appointment status in one transaction.
  *Privacy:* `phone_number` is out of the `authenticated` column grant;
  `profile_phone()` answers only for the owner, an admin, a treating
  doctor, the registering ASHA, or a currently dispatched ambulance.
  *Translation:* `/api/ai/translate` requires a session, caps length,
  validates the target language, rate-limits per user, and uses the
  project's Gemini key - no more fake `[HI] ...` output with no key set.
  *Forms:* one `useOfflineFormGuard()` hook replaces the crash-on-submit
  behaviour of ~15 `useActionState` forms offline; the emergency form
  says "call 108" instead.
  *Contrast:* light-theme `success`, `marigold-600` and the landing hero
  badge now clear WCAG AA.
  **Status: type-checks, builds, and the whole migration chain
  (schema + 002-005) was applied to a scratch Postgres 16 and exercised -
  two drivers racing for one request, phone-number access by role,
  transactional rollback of a consultation, double-sync of a field visit.
  Not run against the live Supabase project; UI flows behind a login were
  not click-tested.**

## 7. Open Questions

1. **Cloudinary cloud name** — still needed. Avatar upload *and* lab
   result-scan uploads will fail with a clear error message until this
   is set.
2. **`SUPABASE_SERVICE_ROLE_KEY`** — now genuinely required (Phase 2+),
   not just "grab it for later". ASHA-assisted registration and reminder
   dispatch will throw a clear error until it's in `.env.local`.
3. **Not yet done, deliberately out of scope for this pass**: real
   SMS/IVR delivery (needs a telecom provider), a certified ABDM/ABHA
   integration (needs org registration), an accessibility audit, and
   automated tests. See the Architecture Decisions above for why each
   was scoped the way it was.
4. **Marathi needs a native speaker.** The Marathi dictionary strings and
   the Marathi keyword lists in `lib/triage.ts` were written without one.
   Rules can only raise urgency, so a missed keyword degrades to a
   lower-confidence result rather than a false "you're fine" - but this
   is a review task nobody on the team can close alone.
5. **DLT registration for Indian SMS** is a paperwork task, not a code
   one: entity ID, sender header, and one approved template per message
   per language. The steps and where the message texts live are in the
   README ("Real SMS in India (DLT)"). Until it's done, leave
   `SMS_PROVIDER` unset so messages record as `Simulated`, never `Sent`.
6. **Field-visit notes are still stored unencrypted in the database.**
   They are encrypted on the device while queued and in transit, but
   `asha_field_visits.notes` is not in the PHI-encrypted column set the
   way diagnoses and triage text are. Worth closing next.

## 8. Reusable Kickoff Prompt

Paste this to resume work in a new session:

> Continue building the Rural Healthcare Accessibility Platform. Read
> `progress.md` at the repo root first — it has the tech stack, DB
> design, decisions log, and phase checklist. Pick up at the next
> unchecked phase, implement it, then update `progress.md` (check the
> box, add a line to the Decisions Log, note anything left for next
> time) before finishing.
