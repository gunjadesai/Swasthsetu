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
| i18n             | Not yet started - planned Phase 6                               |
| Hosting          | Vercel (app) + Supabase Cloud (DB/auth) — assumed               |

## 3. Architecture Decisions

- **Auth**: Supabase Auth (`auth.users`) + `public.profiles` (1:1, UUID).
  Every domain table references `profiles.id`, not a custom `users` table.
- **Images**: Cloudinary only, via a signed server route
  (`/api/cloudinary/sign`). Browser never sees the API secret.
- **Attachments**: a generic `attachments` table exists for future
  multi-image needs (lab scans, etc). Profile photo uses dedicated
  `profiles.avatar_url` / `avatar_cloudinary_public_id` columns for speed.
- **RLS**: enabled on every table. Policies are written only for what's
  actually built (profiles, roles/lookups, hospitals, doctors,
  doctor_availability, patients, patient_medical_history, appointments,
  medical_records, prescriptions, prescription_items, attachments).
  Every other table is RLS-enabled with no policy - locked until its
  phase, not an open hole.
- **Signup flow simplification**: Supabase "Confirm email" must be
  turned off for Phase 1 (see README) so signup gets an active session
  immediately. This is flagged, not hidden - re-enable + add a real
  confirmation flow before production.
- **Booking logic**: doctor sets recurring weekly availability blocks
  (`doctor_availability`); available slots are computed at request time
  by subtracting already-booked appointment times, and past times are
  excluded for same-day bookings.

## 4. Decisions Log

- Phase 1 fully builds: **Patient + Doctor** (not ASHA, not Admin - those
  come later).
- Login method: **email + password** (phone/OTP deferred).
- Codebase: **fresh Next.js project** (no existing repo to integrate with).
- Design direction: deep teal (`#0F4C46`) + warm marigold accent
  (`#D9A441`) on a soft warm-grey field, IBM Plex Sans throughout (chosen
  partly for its Devanagari companion cut, ahead of Phase 6 multilingual
  work). Flat surfaces with hairline borders instead of card shadows.

## 5. Environment Variables Needed

| Variable                              | Status                          |
|----------------------------------------|----------------------------------|
| `NEXT_PUBLIC_SUPABASE_URL`             | ✅ have it                       |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | ✅ have it                       |
| `SUPABASE_SERVICE_ROLE_KEY`            | ❌ needed for later phases       |
| `CLOUDINARY_CLOUD_NAME`                | ❌ still needed - blocks image upload until provided |
| `CLOUDINARY_API_KEY`                   | ✅ have it (server-only)         |
| `CLOUDINARY_API_SECRET`                | ✅ have it (server-only)         |

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

- [ ] **Phase 2 — ASHA Worker**
  ASHA-assisted patient registration, field-visit logging, village/hospital
  directory & search, RLS policies for `asha_workers`/`asha_field_visits`.

- [ ] **Phase 3 — Lab & Pharmacy**
  Lab test ordering + result upload (Cloudinary scans via the
  `attachments` table), pharmacy medicine-availability tracker.

- [ ] **Phase 4 — Ambulance & Referrals**
  Ambulance request + live status, referral flow between hospitals.

- [ ] **Phase 5 — Admin, reporting, reminders & feedback**
  Admin dashboards/aggregates, health-scheme info, in-app + email
  reminders, feedback/complaints.

- [ ] **Phase 6 — Multilingual, offline-first, real teleconsult, polish**
  next-intl rollout, offline capture + sync queue for the ASHA flow, real
  video-consult integration (teleconsult_sessions table already exists),
  accessibility pass, deployment hardening.

## 7. Open Questions

1. **Cloudinary cloud name** — still needed. Avatar upload will fail with
   a clear error message until this is set.

## 8. Reusable Kickoff Prompt

Paste this to resume work in a new session:

> Continue building the Rural Healthcare Accessibility Platform. Read
> `progress.md` at the repo root first — it has the tech stack, DB
> design, decisions log, and phase checklist. Pick up at the next
> unchecked phase, implement it, then update `progress.md` (check the
> box, add a line to the Decisions Log, note anything left for next
> time) before finishing.
