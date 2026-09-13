# Swasthsetu — Full Technical Documentation

This is the complete technical reference for the project: every technology
used, why it's used, and exactly where in the codebase it lives. For the
build history / phase checklist see [progress.md](progress.md); for setup
steps see [README.md](README.md). This file is the "what is everything and
where" reference.

---

## 1. What this is

Swasthsetu is a multilingual, offline-tolerant healthcare platform connecting
**8 kinds of users** — patients, ASHA (community health) workers, doctors,
hospital/PHC staff, lab staff, pharmacy staff, ambulance providers, and
district administrators — in one app, built for SIH 2026 problem statement
SIH26133 ("Accessibility and quality of public healthcare services,
particularly in rural and underserved areas", Govt. of Maharashtra).

It's a single Next.js app. There is no separate backend server — "backend"
logic lives in Next.js Server Actions and Route Handlers that talk directly
to Supabase (Postgres).

---

## 2. Tech stack

| Concern | Technology | Version | Why / where |
|---|---|---|---|
| Framework | [Next.js](https://nextjs.org) (App Router) | ^15.1.0 | Every route under [app/](app/); Server Components by default, Server Actions for writes |
| Language | TypeScript | ^5.6.0 | Whole codebase; `tsconfig.json` |
| UI runtime | React | ^19.0.0 | — |
| Styling | Tailwind CSS | ^3.4.0 | Utility classes everywhere; theme tokens in [tailwind.config.ts](tailwind.config.ts), base styles in [app/globals.css](app/globals.css) |
| UI primitives | Hand-rolled (no component library) | — | [components/ui/](components/ui/) — `Button`, `Card`, `Badge`, `Input`, `Label` |
| Icons | [lucide-react](https://lucide.dev) | ^0.400.0 | Every icon in nav/forms/buttons |
| Fonts | `next/font/google` — IBM Plex Sans + IBM Plex Sans Devanagari | — | Loaded in [app/layout.tsx](app/layout.tsx); Devanagari cut swapped in via `:lang(hi)` in [app/globals.css](app/globals.css) so Hindi doesn't fall back to a mismatched system font (Gujarati has no such companion cut in this family, so it falls back to the browser's own Gujarati font) |
| Database | [Supabase](https://supabase.com) Postgres | `@supabase/supabase-js` ^2.45.0, `@supabase/ssr` ^0.5.0 | Schema in [supabase/schema.sql](supabase/schema.sql) + [supabase/migrations/002_phase2_to_6.sql](supabase/migrations/002_phase2_to_6.sql) |
| Auth | Supabase Auth (`auth.users`) | — | Email + password only (no OTP/social login). Session cookie read/written via `@supabase/ssr` in [middleware.ts](middleware.ts) and [lib/supabase/server.ts](lib/supabase/server.ts) |
| Authorization | Postgres Row Level Security (RLS) | — | Every table — policies defined directly in the two SQL files above, not in app code |
| Data fetching | Server Components + Server Actions | — | No React Query/SWR/tRPC — pages `await supabase.from(...)` directly; mutations are `"use server"` functions colocated as `actions.ts` next to each page |
| Forms | Native `<form>` + `useActionState`/`useFormStatus` | — | No React Hook Form despite `react-hook-form`/`@hookform/resolvers` being installed dependencies (present in `package.json` but not currently wired into any form) |
| Validation | [Zod](https://zod.dev) | ^3.23.0 | Server-side only, e.g. `signupSchema` in [app/signup/actions.ts](app/signup/actions.ts) |
| Media storage | [Cloudinary](https://cloudinary.com) | ^2.5.0 | Signed, browser-direct uploads — see §7.6 |
| Video calls | Embedded [Jitsi Meet](https://meet.jit.si) (External API) | — | See §7.2 |
| Dates | [date-fns](https://date-fns.org) | ^4.1.0 | Formatting appointment/visit dates across the app |
| Class merging | `clsx` + `tailwind-merge` (via `cn()`) | ^2.1.0 / ^2.5.0 | [lib/utils.ts](lib/utils.ts) |
| i18n | Custom, hand-rolled | — | [lib/i18n/](lib/i18n/) — **not** `next-intl` (see §7.1 for why) |
| Offline support | `localStorage`-backed queue | — | [lib/offline-queue.ts](lib/offline-queue.ts) — ASHA field-visit logging only |
| Hosting (assumed) | Vercel (app) + Supabase Cloud (DB/auth) | — | Not yet actually deployed as of this writing |

---

## 3. Repository map

```
app/                      Next.js App Router — one folder per route
  patient/                Patient-facing pages (dashboard, appointments, triage, queue, emergency, schemes, medicine-search, feedback, profile)
  doctor/                 Doctor-facing pages (dashboard, availability, appointments/[id] consult flow, profile)
  asha/                   ASHA worker (onboarding, dashboard, patient registration, visits, triage, directory)
  hospital/               Hospital/PHC staff (onboarding, dashboard, queue, referrals, feedback)
  lab/                    Lab staff (onboarding, dashboard/order queue)
  pharmacy/               Pharmacy staff (onboarding, dashboard/stock)
  ambulance/              Ambulance provider (onboarding, dashboard/request board)
  admin/                  Administrator (dashboard, schemes CRUD, feedback resolution)
  api/                    Route Handlers: cloudinary/sign, fhir/patient/[id]/summary, reminders/dispatch
  login/, signup/         Shared auth pages
  layout.tsx, page.tsx    Root layout (fonts, locale) and landing page
  globals.css             Tailwind base layer + focus-ring + font-per-language rules
components/
  ui/                     Design-system primitives (Button, Card, Badge, Input, Label)
  nav/                    DashboardNav (shared sidebar for all 8 roles), SignOutButton
  language-switcher.tsx, notification-bell.tsx, teleconsult-room.tsx, avatar-uploader.tsx
  triage/                 Triage wizard (symptom picker UI)
lib/
  supabase/               server.ts (cookie-scoped, RLS-respecting), client.ts (browser), admin.ts (service-role, bypasses RLS)
  i18n/                   dictionaries.ts, get-dictionary.ts (server), locale-context.tsx (client)
  actions/                Cross-role server actions: teleconsult-actions.ts, triage-actions.ts
  auth-actions.ts         signOut()
  profile-actions.ts      updateAvatar()
  cloudinary.ts           Signed-upload helper (server-only)
  offline-queue.ts        localStorage queue for ASHA field visits
  triage.ts               Rule-based symptom-to-urgency engine
  types.ts                Hand-written TS types mirroring the SQL schema
  utils.ts                cn() class-merge helper
supabase/
  schema.sql              Phase 1 schema: tables, RLS, seed roles (destructive/re-runnable)
  migrations/002_phase2_to_6.sql   Additive: Phase 2-6 tables, RLS, seed directory data
middleware.ts              Session refresh + role-based route protection
progress.md                 Build tracker: phase checklist, decisions log, open questions
```

---

## 4. Authentication & authorization

### 4.1 Sign-up / login

- **Sign-up** ([app/signup/actions.ts](app/signup/actions.ts)): Zod-validates
  the form, calls `supabase.auth.signUp({ email, password })`, inserts a
  `profiles` row, and for `Patient`/`Doctor` also inserts the matching
  `patients`/`doctors` row immediately. The other 5 self-serve roles
  (ASHAWorker, HospitalStaff, LabStaff, PharmacyStaff, AmbulanceProvider)
  redirect to a role-specific `/<role>/onboarding` page instead, because
  picking a village/hospital/lab/pharmacy/vehicle requires an authenticated
  session (those lookup tables' RLS policies are `authenticated`-only).
  `Administrator` has **no self-serve sign-up** — an account is promoted
  manually by running a commented-out `UPDATE profiles ...` statement at the
  bottom of `supabase/migrations/002_phase2_to_6.sql`.
- **Login** ([app/login/actions.ts](app/login/actions.ts)):
  `supabase.auth.signInWithPassword`.
- **Prototype simplification**: Supabase's "Confirm email" setting must be
  turned off, otherwise sign-up doesn't return an active session (the app has
  no confirmation-link flow yet).

### 4.2 Sessions

Three separate Supabase client constructors exist, each for a different
trust context:

| File | Used from | Key used | Notes |
|---|---|---|---|
| [lib/supabase/server.ts](lib/supabase/server.ts) | Server Components, Server Actions, Route Handlers | publishable/anon | Reads/writes the session via `next/headers` cookies so RLS sees the real `auth.uid()` |
| [lib/supabase/client.ts](lib/supabase/client.ts) | Client Components (`"use client"`) | publishable/anon | Safe for the browser — RLS is still the real gate |
| [lib/supabase/admin.ts](lib/supabase/admin.ts) | **Only** [app/asha/(app)/patients/register/actions.ts](app/asha/(app)/patients/register/actions.ts) and [app/api/reminders/dispatch/route.ts](app/api/reminders/dispatch/route.ts) | `SUPABASE_SERVICE_ROLE_KEY` | Bypasses RLS entirely — needed to create an `auth.users` row for a patient with no email/device, and for the reminder-dispatch cron job which has no end-user session |

### 4.3 Role-based routing

[middleware.ts](middleware.ts) runs on every request:
1. Refreshes the Supabase session cookie.
2. Redirects signed-out users away from any protected prefix (`/patient`,
   `/asha`, `/doctor`, `/hospital`, `/lab`, `/pharmacy`, `/ambulance`,
   `/admin`) to `/login`.
3. Redirects signed-in users away from `/login`/`/signup` to `/`.
4. Looks up the user's role and, if they're inside a section that isn't
   their own (e.g. a Patient hitting `/doctor/...`), redirects them to their
   own dashboard via the `ROLE_HOME` map.

### 4.4 Database-level authorization (RLS)

Every table has Row Level Security **enabled**, and as of migration 002 every
table also has real **policies** (nothing is silently locked-with-no-policy
anymore). Policies are written directly against `auth.uid()` and a set of
`SECURITY DEFINER` helper SQL functions so policies stay short and can't
recurse:

| Function | Returns | Defined in |
|---|---|---|
| `current_role_name()` | The caller's role name | schema.sql |
| `current_patient_id()` / `current_doctor_id()` | The caller's own row id in that table | schema.sql |
| `current_asha_id()` / `current_staff_hospital_id()` / `current_lab_id()` / `current_pharmacy_id()` / `current_ambulance_id()` | Same idea, one per Phase 2-6 role | migration 002 |
| `is_admin()` | `true` if the caller's role is Administrator | migration 002 |

General pattern: a patient sees only their own rows (or rows linked through
an appointment with their treating doctor); staff see only their own
facility's rows; `is_admin()` is OR'd into almost every `SELECT`/`UPDATE`
policy so admins can see and resolve everything.

---

## 5. Database schema

Postgres via Supabase, defined across two files (run in order):
[supabase/schema.sql](supabase/schema.sql) (Phase 1, destructive/re-runnable)
then [supabase/migrations/002_phase2_to_6.sql](supabase/migrations/002_phase2_to_6.sql)
(Phases 2-6, additive-only).

### 5.1 Tables by module

| Module | Tables |
|---|---|
| Reference/lookup | `roles`, `languages`, `states`, `districts`, `villages` |
| Identity | `profiles` (1:1 with `auth.users`, every domain table hangs off this), `audit_logs`, `attachments` (generic photo/file attachment table) |
| Hospitals | `hospitals`, `hospital_staff` |
| ASHA | `asha_workers`, `asha_field_visits` |
| Patients | `patients`, `patient_medical_history`, `maternal_child_health_records`, `vaccination_records` |
| Doctors | `doctors`, `doctor_availability` |
| Appointments | `appointments`, `teleconsult_sessions` |
| Clinical records | `medical_records`, `prescriptions`, `prescription_items`, `referrals` |
| Lab | `laboratories`, `lab_test_catalog`, `lab_test_orders`, `lab_staff` |
| Pharmacy | `pharmacies`, `medicine_catalog`, `medicine_availability`, `pharmacy_staff` |
| Ambulance | `ambulances`, `ambulance_requests` |
| Admin/ops | `reminders`, `health_schemes` (bilingual columns), `feedback` |
| Triage/queue (Phase 2-6, new concepts not in the original design) | `triage_assessments`, `queue_tickets` |

TypeScript mirrors of these tables (hand-written, not generated) live in
[lib/types.ts](lib/types.ts) — a convenience for autocomplete, not the source
of truth. Once `supabase gen types typescript` is run against a live
project, that generated file should replace it as the real source of truth
(both `lib/supabase/client.ts` and `server.ts` call this out explicitly).

### 5.2 Key relationships

- Every person-linked table hangs off `profiles.id` (a UUID matching
  `auth.users.id`), not a custom `users` table.
- `patients`/`doctors`/`asha_workers`/`hospital_staff`/`lab_staff`/
  `pharmacy_staff` are each a thin "role profile" table with a
  `profile_id` foreign key — one person can only be one of these (enforced
  by the signup flow, not a DB constraint).
- `appointments` is the hub for the clinical flow: it's referenced by
  `teleconsult_sessions`, `medical_records`, `prescriptions`, `feedback`,
  and `queue_tickets`.
- `triage_assessments` can link forward to `appointments`
  (`linked_appointment_id`) or `ambulance_requests`
  (`linked_ambulance_request_id`) — a triage result is the thing that
  *causes* a booking, referral, or ambulance dispatch.

---

## 6. Feature map by role

Every page below is a Server Component that queries Supabase directly;
every listed action is a `"use server"` function in that route's
`actions.ts` unless noted otherwise.

### Patient ([app/patient/](app/patient/), layout: [app/patient/layout.tsx](app/patient/layout.tsx))
- **Dashboard** — upcoming appointments summary.
- **Appointments** ([appointments/page.tsx](app/patient/appointments/page.tsx)) — list + status tabs, cancel ([cancel-button.tsx](app/patient/appointments/cancel-button.tsx)), embedded teleconsult room for Teleconsult-mode visits.
- **Book appointment** ([appointments/book/](app/patient/appointments/book/)) — `getAvailableSlots()` computes free slots from `doctor_availability` minus already-booked `appointments`; `bookAppointment()` inserts one.
- **Symptom Checker / Triage** ([triage/page.tsx](app/patient/triage/page.tsx)) — uses the shared [triage-wizard.tsx](components/triage/triage-wizard.tsx) + `submitTriage()` action (§7.3).
- **Queue Status** ([queue/](app/patient/queue/)) — `checkInToQueue()` issues a token number for same-day walk-in; page shows live status.
- **Emergency** ([emergency/](app/patient/emergency/)) — `requestAmbulance()`, captures browser geolocation.
- **Health Schemes** ([schemes/page.tsx](app/patient/schemes/page.tsx)) — bilingual scheme browser reading `health_schemes`.
- **Find Medicine** ([medicine-search/](app/patient/medicine-search/)) — searches `medicine_availability` across pharmacies.
- **Feedback** ([feedback/](app/patient/feedback/)) — `submitFeedback()`.
- **Profile** ([profile/](app/patient/profile/)) — `updatePatientProfile()`, avatar upload via [avatar-uploader.tsx](components/avatar-uploader.tsx).

### Doctor ([app/doctor/](app/doctor/))
- **Dashboard** — today's appointments.
- **Availability** ([availability/](app/doctor/availability/)) — recurring weekly slot blocks (`addAvailability`/`deleteAvailability`).
- **Appointment detail / consult flow** ([appointments/[id]/](app/doctor/appointments/[id]/)) — `completeConsult()` writes diagnosis + prescription + optional referral + optional lab order in one action, from [consult-form.tsx](app/doctor/appointments/[id]/consult-form.tsx); embedded teleconsult room ([teleconsult-room.tsx](components/teleconsult-room.tsx)) for video visits.
- **Profile** — `updateDoctorProfile()`, specialization/registration number, avatar.

### ASHA Worker ([app/asha/](app/asha/))
- **Onboarding** — pick assigned village.
- **Dashboard** — summary of registered patients / recent visits.
- **Register a Patient** ([patients/register/](app/asha/(app)/patients/register/)) — `registerAssistedPatient()` uses the **service-role client** to create an `auth.users` row for a patient with no email/phone of their own (synthesized `<phone>@asha.rural-health.local` address).
- **Field Visits** ([visits/](app/asha/(app)/visits/)) — `logFieldVisit()` writes online; if offline, the form queues locally via [lib/offline-queue.ts](lib/offline-queue.ts) and `syncFieldVisits()` flushes the queue (manual "Sync now" button or automatic on the browser `online` event).
- **Village/Hospital Directory** ([directory/](app/asha/(app)/directory/)) — searchable facility list.
- **Symptom Checker** — same `submitTriage()` action as the patient flow, run on a chosen patient's behalf ([patient-picker.tsx](app/asha/(app)/triage/patient-picker.tsx)).

### Hospital Staff ([app/hospital/](app/hospital/))
- **Queue** ([queue/](app/hospital/(app)/queue/)) — front-desk board, `updateTicketStatus()` (Waiting → Called → InConsult → Done, etc).
- **Referrals** ([referrals/](app/hospital/(app)/referrals/)) — inbox for referrals into/out of this hospital, `updateReferralStatus()`.
- **Feedback** ([feedback/](app/hospital/(app)/feedback/)) — review feedback left about this hospital, `resolveFeedback()`.

### Lab Staff ([app/lab/](app/lab/))
- **Dashboard/order queue** ([dashboard/](app/lab/(app)/dashboard/)) — `markSampleCollected()`, `attachLabResult()` (uploads result file via Cloudinary, stores it as an `attachments` row, sets order `ResultReady`).

### Pharmacy Staff ([app/pharmacy/](app/pharmacy/))
- **Stock dashboard** ([dashboard/](app/pharmacy/(app)/dashboard/)) — `updateStock()` per medicine per pharmacy.

### Ambulance Provider ([app/ambulance/](app/ambulance/))
- **Request board** ([dashboard/](app/ambulance/(app)/dashboard/)) — `acceptRequest()`, `completeRequest()`, `toggleAvailability()`.

### Administrator ([app/admin/](app/admin/))
- **Dashboard** — district-level aggregate counts.
- **Schemes** ([schemes/](app/admin/schemes/)) — `createScheme()`/`toggleSchemeActive()`, bilingual (English + Hindi) fields.
- **Feedback** ([feedback/](app/admin/feedback/)) — global `resolveFeedback()`.

---

## 7. Cross-cutting subsystems

### 7.1 Internationalization ([lib/i18n/](lib/i18n/))

A deliberately custom, lightweight i18n layer instead of `next-intl` — chosen
specifically to avoid restructuring every route under a `/[locale]/...`
segment. Supports **English, Hindi, and Gujarati**.

- [dictionaries.ts](lib/i18n/dictionaries.ts) — one flat `key -> string`
  object per locale (`en`/`hi`/`gu`), typed so every locale is statically
  required to have every key (`satisfies Record<Locale, Record<string, string>>`).
- [get-dictionary.ts](lib/i18n/get-dictionary.ts) — server-side: reads the
  `NEXT_LOCALE` cookie, returns a `t(key)` translator that falls back to
  English then the raw key if a translation is missing (so a
  partially-localized page never renders blank).
- [locale-context.tsx](lib/i18n/locale-context.tsx) — client-side
  counterpart (`useTranslation()`), seeded from the server-resolved locale
  via `LocaleProvider` so the first client render matches SSR (no
  flash-of-English on hydration).
- [components/language-switcher.tsx](components/language-switcher.tsx) — the
  EN/हि/ગુ toggle in the sidebar header; writes the `NEXT_LOCALE` cookie and
  calls `router.refresh()`.
- **Coverage**: nav labels, landing/auth pages, and the triage/emergency/
  schemes flows are translated; not every string in the app yet — anything
  missing a key silently falls back to English.

### 7.2 Teleconsultation ([components/teleconsult-room.tsx](components/teleconsult-room.tsx), [lib/actions/teleconsult-actions.ts](lib/actions/teleconsult-actions.ts))

Real video calls via an **embedded Jitsi Meet room** on the free
`meet.jit.si` server — no vendor account or API key needed.

- `getOrCreateTeleconsultRoom(appointmentId)` creates (once) a
  `teleconsult_sessions` row with a room URL shaped
  `https://meet.jit.si/swasthsetu-<appointmentId>-<random>` — the random
  suffix keeps the room unguessable.
- The client loads Jitsi's `external_api.js` and embeds the call via the
  `JitsiMeetExternalAPI` constructor (a plain `<iframe src="...">` gets
  redirected by Jitsi's own anti-embedding check instead of loading the
  call).
- `markTeleconsultJoined`/`markTeleconsultEnded` timestamp
  `teleconsult_sessions.started_at`/`ended_at`. Leaving the call — via
  Jitsi's own hangup button (the `videoConferenceLeft` event) or the app's
  own close (✕) button rendered over the video panel — disposes the Jitsi
  instance and resets the component back to the "Join video consult" button.

### 7.3 Digital triage ([lib/triage.ts](lib/triage.ts), [lib/actions/triage-actions.ts](lib/actions/triage-actions.ts))

A **rule-based weighted symptom checklist**, deliberately not an ML model —
auditable (a doctor can see exactly why a patient was routed somewhere) and
a realistic scope for the build. `SYMPTOM_OPTIONS` maps ~14 symptoms to an
urgency weight (`Low`/`Medium`/`High`/`Emergency`); `computeTriageResult()`
takes the *worst* selected weight and maps it to a `recommended_action`:

| Urgency | Recommended action |
|---|---|
| Low | Self-care at home |
| Medium | Book a regular appointment |
| High | Visit PHC/hospital soon |
| Emergency | Call an ambulance now |

(`Teleconsult` also exists as a possible `recommended_action` value in the
type system, reachable from other flows even though the automatic mapping
above never produces it directly.) Shared by both the patient self-triage
page and the ASHA-assisted triage page via one `submitTriage()` action.

### 7.4 Offline tolerance ([lib/offline-queue.ts](lib/offline-queue.ts))

ASHA field-visit logging queues to `localStorage` (not IndexedDB — visits
are small text records with no blobs, so no new dependency was justified).
Every read/write is wrapped in `try/catch` so a rural field app never
crashes the form just because storage is disabled (private browsing, etc.)
— it just behaves as if nothing were queued. Synced via a manual "Sync now"
button or automatically on the browser's `online` event.

### 7.5 Reminders & notifications

- **In-app**: [components/notification-bell.tsx](components/notification-bell.tsx)
  reads `reminders` rows with `status = 'Sent'` for the signed-in patient —
  this genuinely *is* full delivery for the `App` channel.
- **SMS/IVR**: [app/api/reminders/dispatch/route.ts](app/api/reminders/dispatch/route.ts)
  is a system cron job (uses the service-role client, no end-user session).
  It marks due `App` reminders `Sent`, but `SMS`/`IVR` reminders are marked
  `Failed` with an explicit reason — there's no telecom provider (Twilio,
  MSG91, etc.) wired in. Trigger it externally (Vercel Cron / Supabase
  scheduled function / manual call) — nothing calls it automatically today.

### 7.6 Media uploads ([lib/cloudinary.ts](lib/cloudinary.ts), [app/api/cloudinary/sign/route.ts](app/api/cloudinary/sign/route.ts))

Signed, browser-direct uploads — the app server never touches file bytes:
1. Browser calls `POST /api/cloudinary/sign` (must be signed in).
2. Route signs upload params scoped to a folder named after the caller's
   own profile id (`swasthsetu/<user.id>`), using the server-only
   `CLOUDINARY_API_SECRET`.
3. Browser uploads the file straight to Cloudinary using that signature.
4. Browser sends the resulting `secure_url` + `public_id` back to a normal
   Server Action (e.g. `updateAvatar()`, `attachLabResult()`) to store in
   Postgres.

Two storage shapes: `profiles.avatar_url`/`avatar_cloudinary_public_id`
(dedicated columns, for the one thing every profile has) and a generic
`attachments` table (owner + related-table/id + Cloudinary id/url) for
everything else — currently lab result scans.

### 7.7 FHIR interoperability export ([app/api/fhir/patient/[patientId]/summary/route.ts](app/api/fhir/patient/[patientId]/summary/route.ts))

`GET /api/fhir/patient/:patientId/summary` returns a FHIR R4-shaped
`Bundle` (`Patient` + `Condition` per medical record + `MedicationRequest`
per prescription item), built from the normal RLS-scoped client — so a
patient can only ever export their own record, a doctor only a patient
they've treated. Explicitly **not** a certified ABDM/ABHA integration (that
needs an org registration this project doesn't have) — it's an honest
"here's the standards-shaped structure" answer rather than an overclaim.

### 7.8 Design system

- **Colors** ([tailwind.config.ts](tailwind.config.ts)): deep teal (`teal.500 #166A61`,
  clinical trust) + warm marigold accent (`marigold.500 #D9A441`, used
  sparingly) on a soft warm-grey field (`sage`), flat surfaces with hairline
  borders instead of drop shadows (shadows read as muddy on cheap rural
  phone screens).
- **Accessibility**: visible `:focus-visible` ring everywhere (low-end
  Android browsers give no useful hover state), `prefers-reduced-motion`
  respected globally — both in [app/globals.css](app/globals.css).
- **Primitives**: [components/ui/](components/ui/) — `Button`, `Card`,
  `Badge`, `Input`, `Label` — thin wrappers with `cn()`-merged Tailwind
  classes, no external component library.

---

## 8. API routes

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/cloudinary/sign` | POST | Signed-in user (any role) | Returns a Cloudinary upload signature scoped to the caller's own folder |
| `/api/fhir/patient/[patientId]/summary` | GET | Signed-in user, RLS-scoped | FHIR R4 Bundle export of one patient's conditions + medications |
| `/api/reminders/dispatch` | POST | None (system job — call from a trusted trigger only) | Marks due `App` reminders `Sent`, due `SMS`/`IVR` reminders `Failed` |

---

## 9. Environment variables

| Variable | Exposed to browser? | Required for |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Every Supabase call |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Every Supabase call (RLS is the real gate, not this key) |
| `SUPABASE_SERVICE_ROLE_KEY` | **No** | ASHA-assisted patient registration, reminder dispatch — throws a clear error if missing |
| `CLOUDINARY_CLOUD_NAME` | No (server-only, name itself isn't sensitive) | Any image/file upload |
| `CLOUDINARY_API_KEY` | No | Any image/file upload |
| `CLOUDINARY_API_SECRET` | **No — never prefix with `NEXT_PUBLIC_`** | Signing upload requests |

Copy [.env.local.example](.env.local.example) to `.env.local` and fill in
real values — see [README.md](README.md) for the full setup walkthrough
(installing deps, running the two SQL files, disabling email confirmation,
promoting an admin).

---

## 10. What's intentionally out of scope

From [progress.md](progress.md) §7 — not oversights, documented gaps:

- Real SMS/IVR delivery (needs a telecom provider like Twilio/MSG91).
- A certified ABDM/ABHA integration (needs an org registration this
  prototype doesn't have) — the FHIR export is the honest stand-in.
- A formal accessibility audit.
- Automated tests (none exist yet).
- Actual deployment (Vercel + Supabase Cloud is the assumed target, not yet
  live).
