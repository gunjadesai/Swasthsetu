# Swasthsetu: evaluator preparation playbook

Prepared from repository inspection on 12 September 2026.

**Positioning:** Swasthsetu is an ASHA-assisted rural healthcare coordination prototype. Its strongest direction is helping people complete the steps between first contact, consultation, referrals, diagnostics, and follow-up.

**Evidence boundary:** This review inspected application routes, shared components, server actions, database schema/policies, integration code, and project documentation. `node node_modules/typescript/bin/tsc --noEmit --incremental false` passed. A live database, real video call, uploads, and multi-user workflows were not tested. Findings about database behavior assume the checked-in SQL is deployed without additional policies. No application code or database was changed.

## 1. Problem statement and what it means

The README identifies the project with SIH26133, SIH 2026, Government of Maharashtra, and the title “Accessibility and quality of public healthcare services, particularly in rural and underserved areas.” This review did not independently verify that identifier, year, department, or exact official wording. Verify them against your official SIH submission before putting them on slides. Repository comments about evaluator scoring are not official scoring evidence.

Your practical interpretation can be:

> A rural patient needs more than access to a doctor. They need to know where to go, obtain care with limited digital access, carry information across providers, complete tests and referrals, and receive follow-up. Swasthsetu addresses the coordination gaps in that journey.

Describe these as problem hypotheses until supported by interviews or field observations:

| Gap | What it means for a person | Project response |
|---|---|---|
| Uncertain availability | A trip may end without a consultation or medicine | Doctor slots, facility directory, reported medicine stock |
| Limited digital access | A self-service app can exclude the intended user | ASHA-assisted registration and symptom capture |
| Intermittent connectivity | Field records may be delayed or lost | Local pending queue for ASHA visits |
| Disconnected services | Patients carry the coordination burden | Shared patient identifiers, doctor-created referrals and lab orders |
| Limited operational visibility | Staff cannot easily identify unresolved work | Referral/status boards, feedback queues, basic aggregate counts |

Separate **access** from **quality**. Access means entering and navigating care. Quality also involves clinical competence, safety, appropriate treatment, continuity, and outcomes. Your software supports some of these processes; it has not established an improvement in clinical outcomes.

Do not imply software creates doctors, beds, medicines, or ambulances. It can make existing capacity more visible and coordination more reliable.

## 2. Understand the project by role

“Implemented” below means code exists, not that the feature has passed a live acceptance test.

| Role | Implemented surface | Boundary to explain |
|---|---|---|
| Patient | Registration, profile, appointment booking/cancellation/history, symptom checklist, queue check-in/status, emergency request, medicine search, schemes, feedback, record export | Self-service still uses email/password and connectivity |
| ASHA worker | Village onboarding, assisted registration, own registered-patient list, field visits, offline visit queue/sync, directory, assisted triage | Assisted booking and emergency continuation are incomplete; registration still needs a phone number and online backend |
| Doctor | Availability, appointments, consultation notes, prescription, referral and lab-order creation, video component | No credential approval workflow; consult saves are not atomic |
| Hospital staff | Hospital onboarding, queue board, referral inbox, feedback resolution | Queue and referral visibility need multi-role testing; joined patient names may be filtered by RLS |
| Lab staff | Lab onboarding, order list, sample-collected action, result-summary/image upload | Results are not surfaced as a complete doctor/patient review-and-follow-up journey |
| Pharmacy staff | Pharmacy onboarding, manual stock editing | Search reflects reported stock, without reservation, dispensing confirmation, or freshness guarantees |
| Ambulance provider | Vehicle onboarding, request board, accept/complete, availability toggle | Supplied policies block ordinary providers from seeing/claiming unassigned requests; no nearest-vehicle algorithm |
| Administrator | Aggregate counts, scheme management, feedback resolution | “District overview” is not district-filtered; some counts are filtered by policies that lack admin access |

Maternal/child health, vaccination, and audit tables do not by themselves establish complete working modules. Avoid presenting schema-only capabilities as finished features.

## 3. Architecture in plain language

Use this explanation:

> The user interface is built with Next.js, React, TypeScript, and Tailwind. Server actions process application workflows. Supabase provides authentication and PostgreSQL storage. Database row-level policies are intended to restrict access by patient, worker, and facility. Cloudinary handles uploads through server-generated signatures. Jitsi supplies video conferencing. Small ASHA visit records can wait locally until connectivity returns.

Data relationships to understand:

- Authentication identity → profile → patient, doctor, or worker record.
- Patient + doctor → appointment → medical record → prescription and prescription items.
- Consultation → lab order; consultation can also create a patient referral.
- ASHA → registered patients and field visits.
- Patient → triage record, queue ticket, emergency request, feedback.
- Pharmacy + medicine → stock record.

Why this stack is reasonable: healthcare workflows contain related records and permissions; a relational database makes those relationships explicit. Shared TypeScript and server actions reduce prototype complexity. That is an engineering rationale, not evidence of national-scale readiness.

Know these terms:

- **PHC:** Primary Health Centre.
- **ASHA:** Accredited Social Health Activist.
- **RLS:** Row Level Security; database rules controlling which rows a caller may access.
- **FHIR:** A healthcare data exchange standard; an export with similar structure still needs validation.
- **ABDM:** Ayushman Bharat Digital Mission.
- **ABHA:** Ayushman Bharat Health Account; storing a health-ID string is not integration.
- **Idempotency:** Retrying one operation does not create a duplicate outcome.
- **Transaction:** Related writes succeed or fail together.

## 4. What can differentiate this project

Do not claim uniqueness against every team. No review of this repository can establish that. Make a specific, demonstrable claim.

### A. Assisted access

Say: “We designed an entry point for people who cannot operate the app themselves: an ASHA can register a patient and capture a visit.”

Proof: show the ASHA recording information for a synthetic patient. Boundary: an email-less patient is supported through a placeholder account, but truly phone-less registration and secure later account claiming are not solved.

### B. Continuity across services

Say: “We model the handoffs surrounding a consultation: the doctor can generate a prescription, lab order, and referral within the same workflow.”

Proof: create an order/referral and show it under the receiving role. Boundary: complete closure, report review, ASHA notification, and overdue escalation still need development.

### C. Field-work resilience

Say: “ASHA visit capture can continue on an already loaded page when connectivity drops, then synchronize.”

Proof: disconnect after opening the form, save a synthetic visit, reconnect and verify exactly one database record. Boundary: this is not a full offline application; login, cold launch, triage submission, and video are not offline.

### D. Explainable routing

Say: “The symptom checklist selects the highest urgency among chosen symptoms, so its output can be inspected.”

Proof: explain a synthetic selection directly from the rule table. Boundary: explainability does not establish clinical correctness. There is no trained AI model, measured accuracy, or clinical validation.

### E. A measurable implementation target

Say: “Our proposed pilot will measure completed referrals, overdue follow-ups, ASHA task time, and successful synchronization.”

Proof: show a measurement plan now; show real results only after obtaining them. This is stronger than an unsupported percentage reduction in waiting time.

## 5. Existing systems: answer respectfully and accurately

eSanjeevani already supports both assisted/provider-to-provider and patient-to-provider telemedicine. Therefore “assisted rural teleconsultation” alone is not your novelty. See [C-DAC's eSanjeevani description](https://www.cdac.gov.in/index.aspx?id=product_details&productId=eSanjeevaniNationalTelemedicineService).

ABDM already addresses health identities and consent-based record sharing. Its official FAQ describes ABHA and the health information exchange/consent framework. See [NHA's ABDM FAQ](https://abdm.gov.in/faqs).

Use this response:

> We recognize existing public digital infrastructure. Our proposed contribution is the local workflow around care: assisted entry, field capture during connectivity gaps, and accountable handoffs between services. We would pursue integration where permitted, and evaluate whether this fills a real local gap before expanding.

This is a proposed positioning, not a proven competitive advantage. Do not say eSanjeevani or other products lack a feature unless you have verified that exact comparison. Your own application does not currently integrate with eSanjeevani or ABDM.

## 6. A 90-second pitch

> Imagine a person in a village who needs medical attention but does not know which facility has an available doctor, cannot comfortably use a digital app, and has to coordinate tests and referrals themselves.
>
> Swasthsetu is our rural healthcare coordination prototype. It provides an ASHA-assisted entry point alongside patient self-service. We have implemented appointment and consultation workflows, doctor-created prescriptions and referrals, lab orders, reported medicine availability, and field-visit capture that can queue locally when connectivity drops.
>
> The focus of our design is continuity: who receives the next task, what information travels with it, and whether the patient completes that step. Our current implementation contains these building blocks; our next priority is connecting them into a reliable follow-up loop.
>
> We use a transparent symptom checklist for prototype routing, with diagnosis and treatment remaining with clinicians. We do not claim clinically validated triage or certified ABDM integration.
>
> We propose starting with one PHC and a small ASHA team, measuring referral completion, worker time, and follow-up gaps. The outcome we want is fewer patients losing their way between steps of care.

Use “implemented” rather than “working end to end” until the rehearsed live flow supports the latter.

## 7. Demo plan: one story with honest boundaries

Prepare synthetic data, pre-authenticated role sessions, a verified schema, and a short backup recording. Use separate browser profiles for roles so signing in as a doctor does not replace the patient session.

| Time | Show | Explain |
|---|---|---|
| 0:00–0:40 | Rural care scenario | Who has the problem and where coordination breaks |
| 0:40–1:30 | ASHA registration/visit | How assisted access works |
| 1:30–2:10 | Offline visit capture and sync | The precise resilience boundary |
| 2:10–3:10 | Prepared patient appointment and doctor consult | How information becomes a recorded clinical encounter |
| 3:10–4:15 | Prescription, lab order, referral inbox | How another role receives the next step |
| 4:15–4:45 | Patient prescription and medicine search | Practical support after consultation |
| 4:45–5:30 | Limitations and next-step timeline concept | What exists today and what would close the loop |

Until assisted booking is implemented, explicitly say that the appointment demonstration uses a separately prepared self-service patient. Do not imply the current app automatically moves the ASHA-created patient through this entire chain.

Queue, ambulance, and video should enter the main demo only after their blockers are repaired and tested. Eight dashboards are unnecessary in a five-minute presentation.

For video, test the actual devices and network: Jitsi's public service requires the meeting creator to authenticate. A platform login does not replace that requirement. See [Jitsi's authentication notice](https://jitsi.org/blog/authentication-on-meet-jit-si/).

## 8. Technical findings to fix before making strong claims

These are static findings, not exploit tests against a live deployment.

| Priority | Finding and consequence | Code evidence | Required outcome |
|---|---|---|---|
| Critical | Profile INSERT/UPDATE policies check the user's ID but do not restrict `role_id`. With ordinary table write grants, the database permits self-assigned elevated roles despite the signup UI excluding admin. | `supabase/schema.sql`: `profiles_insert_own`, `profiles_update_own`; `profiles.role_id` | Server-controlled role assignment, restricted columns, approval workflow, negative authorization tests |
| Critical | Reminder dispatch uses service-role privileges without checking caller authorization; middleware does not protect this API prefix. | `app/api/reminders/dispatch/route.ts`, `middleware.ts` | Authenticate a trusted scheduler, reject other callers, verify write results |
| High | Unassigned ambulance requests are not visible/updatable by an ordinary provider under current policies. | Migration 002: `ambulance_requests_select`, `ambulance_requests_update_involved` | Carefully scoped discovery and an atomic claim operation; do not expose all patient data |
| High | `teleconsult_sessions` has RLS enabled and no policies in supplied migrations. Room creation through the normal client is blocked. | `supabase/schema.sql`, `lib/actions/teleconsult-actions.ts` | Appointment-participant policies and one unique session per appointment |
| High | Queue allocation reads the maximum token through patient-scoped RLS. A new patient may repeatedly attempt token 1 when it already exists. | `app/patient/queue/actions.ts`, migration 002 `queue_select` | Atomic hospital/date token allocation with authorization inside the database operation |
| High | Booking INSERT does not revalidate availability; no unique doctor/date/time booking constraint is defined. Displayed availability also sees only RLS-visible appointments. | `app/patient/appointments/book/actions.ts`, appointments schema/policies | Authoritative slot allocation, protected availability query, time-zone handling, concurrency tests |
| High | Offline queue is shared across users on a browser, has no server deduplication, and silently swallows storage failures while the UI reports success. | `lib/offline-queue.ts`, ASHA visit form/actions | Per-worker storage, explicit failures, idempotency keys, retry protection and local-data lifecycle |
| High | ASHA triage result buttons point to patient-only routes and do not preserve an authorized assisted workflow. | `components/triage/triage-wizard.tsx`, `middleware.ts` | Role-aware assisted booking/emergency actions with patient scope checks |
| High | Doctor/staff self-registration and facility selection do not verify authority or credentials. | `app/signup/actions.ts`, role onboarding actions | Verified invitations/approvals and controlled facility assignments |
| Medium | Consultation saves multiple records sequentially. A later failure can leave partial records; retry can duplicate earlier writes. | `app/doctor/appointments/[id]/actions.ts` | Transactional save, valid status transition, idempotent retry |
| Medium | Admin dashboard has no district filter; appointment and ASHA counts lack corresponding admin read policies. Query errors become zero counts. | `app/admin/dashboard/page.tsx`, both SQL files | Authorized aggregate queries scoped to geography; explicit errors |
| Medium | No full lab-result review loop appears in the patient/doctor pages. | Lab actions, patient appointments, doctor consultation page | Result view, clinician acknowledgment, patient/ASHA follow-up task |
| Medium | All authenticated users can read profiles, including phone information. Upload signatures do not establish private access to resulting clinical media. | Profiles SELECT policy, Cloudinary upload code | Minimized profile reads, protected media delivery, retention and access review |
| Medium | Triage ignores unknown symptom keys, lacks clinical context, and does not use free-text notes in its decision. | `lib/triage.ts`, triage action | Strict allowed-key validation and clinician-reviewed protocol with versioning and escalation |
| Medium | Notification reading/dispatch exists, but no automatic reminder-generation workflow or scheduler configuration was found. | Reminder route, patient layout; repository search | Create reminders from approved events, schedule delivery, track outcomes |

Also verify authorization for patient IDs in each role's write actions. A policy saying “this doctor created the row” is not necessarily proof that the doctor may act on the referenced patient. Merely enabling RLS is not sufficient.

## 9. Improvement roadmap

### Before the evaluation demo

1. Correct the critical authorization issues and the RLS blockers affecting the chosen demo.
2. Make one patient journey reliable; verify every handoff under real role sessions.
3. Make booking and queue allocation safe under two simultaneous users.
4. Make offline save confirmations truthful and synchronization idempotent.
5. Check configured services without exposing secrets; documentation about missing configuration may be stale.
6. Replace broad claims such as “fully offline,” “live nearby ambulance,” “AI triage,” and “district analytics” with exact behavior.
7. Run production build and end-to-end smoke tests. The TypeScript check alone is insufficient.

### Highest-value next feature: a care timeline with responsibility

Create a page that answers: What happened? What must happen next? Who owns it? When is it due? Has it been acknowledged?

Example proposed events:

- ASHA visit recorded.
- Appointment confirmed.
- Consultation completed.
- Referral received by destination facility.
- Patient attendance confirmed.
- Test result received and reviewed by doctor.
- Follow-up assigned to ASHA.
- Follow-up completed or escalated with a reason.

This needs explicit event/status data, authorized transitions, owner assignment, timestamps, and notifications. Existing record and patient IDs are a foundation; the full workflow is not already implemented.

### Next usability improvements

Add Marathi and complete translations if Maharashtra is the confirmed target. Test terminology with intended users. Add easy patient search, family/dependent identities, assisted appointments, clear report views, stock “last updated” timestamps, and a lower-bandwidth consultation fallback. Assess offline cold-start support using a service worker and suitable local storage after defining privacy and device-sharing requirements.

### Pilot readiness

Clinician-review the triage protocol, verify providers, implement consent and audited access, use protected clinical media, establish backup/restore and incident procedures, measure performance, and obtain operational participation from the PHC. These are production design requirements, not a claim of legal certification.

ABDM integration is a separate future workstream involving its actual interfaces and consent flows. Validate exports against the intended FHIR profiles; the current export contains database-style values and is not proven conformant.

## 10. Proposed pilot and measurement

Illustrative proposal, not an existing partnership: one PHC, a few participating ASHAs, and a small set of consenting participants, with a baseline observation period followed by a supervised trial. Finalize scope with the facility and clinicians.

| Metric | Definition | Why it matters |
|---|---|---|
| Referral completion | Confirmed destination visits / referrals due in the observation period | Whether handoffs lead to care |
| Referral acknowledgment time | Time from referral creation to destination acknowledgment | How quickly responsibility transfers |
| Overdue follow-ups | Follow-ups past their due time without completion | Work that needs action |
| ASHA task time | Median time for the same recording task before/with the app | Whether digitization adds burden |
| Offline sync success | Unique records synchronized / records successfully queued locally | Reliability under connectivity loss |
| Report review delay | Time from result ready to clinician acknowledgment | Whether results are acted on |
| Avoidable unsuccessful trips | Trips reported unsuccessful because the advertised service/stock was unavailable | Whether availability information helps |

Some metrics require new timestamps/events. Do not imply the current dashboard measures them. Record sample size, missing data, case differences, and uncertainty. Compare equivalent tasks/cases; a small pilot does not prove causality or clinical benefit.

For triage, clinician-labeled cases and sensitivity to urgent conditions matter; do not invent accuracy, run live clinical validation unsupervised, or optimize simply for fewer referrals.

## 11. Adoption and sustainability

The likely adopter to investigate is a PHC/district program or implementation partner. The frontline users are ASHAs, clinicians, and service staff; patients benefit through both assisted and self-service channels.

Proposed adoption approach: observe the current workflow, reuse necessary fields, reduce duplicate entry, train a small team, identify a facility owner, and expand only if operational results justify it. Government procurement or partnerships are possibilities, not existing arrangements.

Prepare a cost model rather than an invented monthly price:

> Total cost = application/database hosting + protected storage + video + messaging + devices/connectivity support + training + operations/support + security and maintenance.

Separate fixed setup costs from per-facility and per-use costs. Free development tiers do not establish free operation at scale. Do not sell patient data as the business model.

## 12. Evaluator FAQ: answers to rehearse

**1. What is Swasthsetu in one sentence?**

An ASHA-assisted rural healthcare coordination prototype that connects patient entry, consultation, and subsequent care tasks.

**2. What exact problem do you solve?**

The coordination burden between steps of care, especially when digital access and connectivity are limited. We will validate the size of that problem with users rather than assuming every village has the same needs.

**3. Who is the primary user?**

For the first proposed pilot, the ASHA and PHC team. Patients can also use the app directly. Focusing the pilot makes training and evaluation practical.

**4. What is novel?**

Our proposed distinction is reliable handoffs and assisted field workflows in one local care journey. Individual features such as video and appointment booking are established capabilities, so we must demonstrate workflow value.

**5. Why not use eSanjeevani?**

It already provides public telemedicine, including assisted care. We would investigate complementing it with local coordination instead of claiming to replace its national service. Integration is not yet built.

**6. Why not use WhatsApp and paper?**

They may be practical today. Our hypothesis is that structured records, scoped access, assigned tasks, and measurable status make follow-up easier. We need to demonstrate that benefit without creating extra entry work.

**7. Is your triage AI?**

No. Fourteen selectable symptoms have fixed urgency categories; the highest selected category determines the output. It is not a weighted sum or trained model.

**8. Why use rules?**

They are simple to inspect and explain in a prototype. Clinical safety still requires reviewed protocols and validation; transparent rules can also be wrong.

**9. What is triage accuracy?**

We have not measured clinical accuracy and will not claim a number. The present checklist is a demonstration of routing logic, not validated medical advice.

**10. Does it diagnose or prescribe?**

The software stores what the doctor enters. The checklist does not establish a diagnosis or generate a prescription.

**11. Does the entire app work offline?**

No. An already loaded ASHA visit form can queue small records locally. Full offline startup, registration, and other network workflows are not supported.

**12. What if synchronization is retried?**

Currently duplicates can occur because local IDs are not used as server deduplication keys. We need idempotent inserts and scoped local queues before depending on it operationally.

**13. Can someone without a smartphone use it?**

An ASHA can perform implemented assisted tasks for them. The current patient-registration shortcut still requires a phone number; phone-less and shared-family identity need improvement.

**14. How does an assisted patient later log in?**

That account-claiming workflow is unfinished. The placeholder email is not a real recovery mailbox, so we should implement verified account claiming rather than promising email reset.

**15. Is Marathi supported?**

Not currently. The dictionaries support Hindi and English, with partial coverage. Marathi and complete localization are priorities if the confirmed deployment is Maharashtra.

**16. Does the app find the nearest ambulance?**

No. It records pickup coordinates and has a manual dispatch board. Geography-based matching, capacity controls, escalation, and dependable request claiming remain to be completed.

**17. Is medicine availability guaranteed?**

No. It reflects quantities entered by pharmacy staff. Freshness timestamps, verification, and reservation/dispensing workflows would improve reliability.

**18. Is queue status live?**

The current page displays status when fetched. We have not implemented a continuous real-time subscription or automatic polling for it.

**19. Does triage automatically prioritize the hospital queue?**

Not in the current check-in action. The queue has priority fields and sorting, but check-in does not map a triage assessment into them.

**20. Are you ABDM integrated?**

No. We provide a limited FHIR-shaped export as a starting point. Actual ABDM integration and consent-based exchange remain future work.

**21. What does the export contain?**

Patient demographics, condition-like entries from medical records, and medication-request-like entries from prescriptions. It is not a complete export of labs, referrals, and all longitudinal records.

**22. Is patient data secure?**

We have authentication, role routing, database policies, and server-side upload signing. The review also identified gaps in role assignment, privileged endpoints, and data exposure. We must close and test them before making a production-security claim.

**23. How are doctors and staff verified?**

They are not independently verified in this prototype. Professional registration fields and signup roles are not verification. Facility-controlled approval is required.

**24. Do SMS and IVR work?**

No. The dispatch route marks those pending messages failed without a provider. In-app display/dispatch code exists, but automated reminder generation and scheduled execution also need completion.

**25. What happens if video fails?**

The current component can show an error; it does not implement a complete fallback workflow. We should add a documented low-bandwidth or rescheduling path and test the conferencing provider's authentication behavior.

**26. Can it scale statewide?**

The architecture gives us a starting point, not evidence. We need load tests, district/facility scoping, reliable concurrency, observability, operating costs, and an incremental rollout.

**27. What is your measured impact?**

We have not run a documented field pilot. Our proposed measures are referral completion, follow-up delay, worker task time, and data synchronization reliability.

**28. What is your biggest weakness?**

The modules are broader than the validated end-to-end workflow. Our next work is strengthening security, handoffs, and reliability so the assisted journey can be demonstrated consistently.

**29. What would you build next?**

After repairing blockers, a shared care timeline with an owner and due date for each next step, particularly lab review and referral follow-up.

**30. What if the facility has no available doctor or medicine?**

The system cannot create capacity. It should show trustworthy availability, offer an approved alternative, and make unresolved demand visible without promising unavailable care.

**31. Why should we select your team?**

We can explain the rural workflow, demonstrate specific implemented parts, identify our limitations, and propose measurable validation. Our focus is turning a visit into a completed sequence of care tasks.

**32. What do you need from evaluators or partners?**

Access to a willing PHC/ASHA team for workflow feedback, clinician review of routing content, and guidance on suitable public-system integration pathways. We are not claiming those partnerships already exist.

## 13. Slide outline and rehearsal checklist

Eight slides: problem and persona; current journey and failure points; focused solution; implemented workflow/demo; architecture; differentiators against verified alternatives; readiness and pilot metrics; prioritized roadmap and partner ask.

Use a before/after scenario instead of a crowded feature list. Label each capability as implemented, demonstrated, or planned. Only upgrade it to demonstrated after a real successful rehearsal.

Before presenting, every team member should be able to explain the role relationships, highest-urgency triage rule, offline boundary, backend permissions, and one concrete limitation. Assign the main speaker, demo operator, technical responder, and adoption/impact responder; combine responsibilities for smaller teams.

Required rehearsal cases: two patients request the same slot; a second patient takes a queue token; an ordinary provider claims an ambulance request; both video participants join one room; one ASHA reconnects after an interrupted save; a different ASHA uses the same device; a clinician receives a lab result; a referral is acknowledged at the destination; an unprivileged user cannot elevate their role.

Use synthetic records in the demo. If a dependency fails, show the labeled backup recording and describe the failure accurately.

**Memorable closing line:** “We want the bridge between services to work as reliably as the services themselves.”
