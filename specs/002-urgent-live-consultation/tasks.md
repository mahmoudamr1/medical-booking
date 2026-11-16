# Tasks: Live Urgent Consultation

## Backend (owner: coordinator)
- [ ] T201 Migration: severity, preferred_doctor_profile_id, outcome_note on urgent_requests; urgent_request_messages table in backend/database/migrations/
- [ ] T202 [US1] VolunteerMatcher::availableNow() + critical wave + directed tier in backend/app/Services/Urgent/VolunteerMatcher.php
- [ ] T203 [US1] UrgentDispatcher directed → broadcast fallback, critical single wave, per-severity timeouts in backend/app/Services/Urgent/UrgentDispatcher.php
- [ ] T204 [US1] CreateUrgentRequest: remove emergency gate, accept severity + preferred doctor in backend/app/Actions/Urgent/CreateUrgentRequest.php
- [ ] T205 [US2] Messages action + controller (participants only, after acceptance, audit) in backend/app/Actions/Urgent/UrgentMessages.php
- [ ] T206 [US2] Outcome note on complete; decline of directed doctor advances immediately in backend/app/Actions/Urgent/UrgentRequestActions.php
- [ ] T207 [US1] Public GET /urgent/available-doctors resource in backend/app/Http/Controllers/Api/V1/Public/UrgentAvailabilityController.php
- [ ] T208 [US4] GET /admin/urgent/live board + settings (critical/directed timeouts) in backend/app/Http/Controllers/Api/V1/Admin/
- [ ] T209 [US5] GET /clinics/{clinic}/urgent-availability in backend/app/Http/Controllers/Api/V1/Clinic/
- [ ] T210 Remove emergency number from urgent notifications, lang files and urgent payloads in backend/lang/
- [ ] T211 Tests: critical wave, directed fallback, available list, messaging privacy, admin board, clinic view, no emergency redirect in backend/tests/Feature/Urgent/
- [ ] T212 Update docs/business-rules.md, docs/api-documentation.md, docs/security.md

## Frontend (owners: agents by path)
- [ ] T213 [US1/US3] /urgent live available-doctors section, severity, directed/broadcast request, live status + messages (urgent-ui) in frontend/src/app/urgent, frontend/src/components/urgent
- [ ] T214 [US2] Doctor urgent page: severity ordering, messages, outcome note (doctor-patient-ui) in frontend/src/app/dashboard/doctor/urgent
- [ ] T215 [US4] Admin urgent live board + new settings (dashboards-ui) in frontend/src/app/dashboard/admin/urgent
- [ ] T216 [US5] Clinic urgent availability card (dashboards-ui) in frontend/src/app/dashboard/clinic
- [ ] T217 Remove every 123/emergency redirect from the UI incl. home urgent banner (frontend agent) in frontend/src
- [ ] T218 E2E: critical request reaches available doctor, accept, message both ways, complete with note

## Keep the request open when no doctor is available (US6, FR-211)
- [ ] T219 [US6] Migration: `waiting` status (re-create CHECK), `keep_open_until` column; `UrgentStatus::Waiting` in MATCHING/OPEN; setting `urgent_wait_max_minutes` (0–120, default 30) in backend/database/migrations/, backend/app/Enums/UrgentStatus.php, backend/app/Services/Settings.php
- [ ] T220 [US6] UrgentDispatcher: close-or-wait on empty round / finalize, deadline finalize, `matchWaiting()` reusing runTier + VolunteerMatcher in backend/app/Services/Urgent/UrgentDispatcher.php
- [ ] T221 [US6] MatchWaitingUrgentRequestsJob + triggers: opt-in / new window (VolunteerController), freed capacity (UrgentRequestActions complete/cancel), sweeper (routes/console.php); cancel allowed while waiting
- [ ] T222 [US6] CreateUrgentRequest sets keep_open_until; resource exposes `keep_open_until`; notifications `waiting` / `redispatched` (ar/en)
- [ ] T223 [US6] Tests: waiting → doctor becomes available → dispatched → accepted; freed capacity; back to waiting; deadline → unmatched (job + sweeper); cancel while waiting; one-open rule; redaction; idempotent jobs; disabled setting; concurrency accept while waiting in backend/tests/Feature/Urgent/KeepOpenTest.php, backend/tests/Concurrency/UrgentAcceptConcurrencyTest.php
- [ ] T224 [US6] Docs: docs/business-rules.md urgent lifecycle, docs/api-documentation.md
- [ ] T225 [US6] Frontend (urgent-ui / doctor-patient-ui / dashboards-ui): `waiting` status + `keep_open_until` countdown + cancel, notification kinds, admin setting `urgent_wait_max_minutes`
