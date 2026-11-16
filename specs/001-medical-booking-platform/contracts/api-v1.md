# API Contract v1
> Superseded for details by `docs/api-documentation.md` (kept in sync with `backend/routes/api.php`).

Base: `/api/v1`. JSON. Auth: Sanctum SPA cookie (`GET /sanctum/csrf-cookie` first, then
`X-XSRF-TOKEN` header). Locale: `Accept-Language: ar|en` (messages localized).

Envelope:
```json
{ "success": true, "message": "…", "data": { }, "meta": { "pagination": { "current_page":1, "per_page":15, "total":0, "last_page":1 } } }
{ "success": false, "message": "…", "errors": { "field": ["…"] }, "code": "booking_conflict" }
```
Status codes: 200, 201, 204, 401, 403, 404, 409 (`booking_conflict`, `invalid_transition`,
`urgent_already_accepted`, `policy_violation`), 422, 429, 500 (generic message only).

## Health
- `GET /health` → `{ status, database, redis, time }`

## Auth
- `POST /auth/register` {name,email,phone?,password,password_confirmation,account_type:patient|doctor,locale?} → 201 user
- `POST /auth/login` {email,password,remember?} → 200 user (429 after 5 failures/min)
- `POST /auth/logout` → 204
- `GET /auth/me` → user {id,name,email,phone,locale,roles[],permissions[],patient_profile?,doctor_profile?,clinics[{id,name,role}]}
- `POST /auth/forgot-password` {email} → 200 (always)
- `POST /auth/reset-password` {token,email,password,password_confirmation} → 200
- `POST /auth/email/verification-notification` → 202; `GET /auth/verify-email/{id}/{hash}` (signed)
- `PATCH /auth/me` {name,phone,locale} ; `PUT /auth/password` {current_password,password,…}

## Public directory (guest)
- `GET /specialties` → list (active, ordered)
- `GET /specialties/{slug}`
- `GET /locations/governorates`, `GET /locations/governorates/{id}/cities`, `GET /locations/cities/{id}/areas`
- `GET /doctors?q&specialty&governorate&city&area&clinic&min_price&max_price&min_rating&date&consultation_type&sort=(recommended|rating|price_asc|price_desc|next_available)&page&per_page`
  → paginated DoctorCard {id,name,title,avatar_url,specialties[],years_experience,rating_avg,rating_count,min_price,primary_branch{…},next_available_at,verified:true}
- `GET /doctors/{id}` → DoctorProfile public (no license/docs)
- `GET /doctors/{id}/services`
- `GET /doctors/{id}/availability?service_id&date_from&date_to` (max 14 days) → `{days:[{date, slots:[{starts_at, ends_at}]}]}`
- `GET /doctors/{id}/reviews?page`
- `GET /clinics?q&governorate&city&page` ; `GET /clinics/{slug}` (branches, doctors, services)
- `GET /home` → {specialties, recommended_doctors, available_today, featured_clinics, popular_services, stats}
- `GET /settings/public` → {emergency_number, urgent_enabled}

## Patient (role: patient)
- `GET /patient/profile` ; `PUT /patient/profile`
- `POST /appointments` {doctor_id, service_id, starts_at, notes?} → 201 Appointment (409 on conflict)
- `GET /patient/appointments?group=upcoming|pending|completed|cancelled&page`
- `GET /appointments/{id}` (policy: participant/clinic/admin)
- `POST /appointments/{id}/cancel` {reason}
- `POST /appointments/{id}/reschedule` {starts_at, service_id?} → 201 new Appointment
- `POST /appointments/{id}/review` {rating, comment?} → 201
- `POST /reviews/{id}/report` {reason}
- `GET /notifications?unread` ; `POST /notifications/{id}/read` ; `POST /notifications/read-all`
- `GET /consents` ; `PUT /consents/{type}` {granted}
- `POST /urgent-requests` {specialty_id?, description, consultation_type, governorate_id, city_id?, area_id?, location_details?, contact_phone, life_threatening:false, disclaimer_acknowledged:true, consent:true} → 201 (422 + `emergency` payload if life_threatening)
- `GET /patient/urgent-requests` ; `GET /urgent-requests/{id}` ; `POST /urgent-requests/{id}/cancel`

## Doctor (role: doctor)
- `GET /doctor/profile` ; `PUT /doctor/profile` (public fields) ; `PUT /doctor/specialties` {specialty_ids[], primary_id}
- `POST /doctor/documents` (multipart file,type) ; `GET /doctor/documents` ; `GET /doctor/documents/{id}/download` ; `DELETE /doctor/documents/{id}`
- `POST /doctor/verification/submit` → status pending
- `GET|PUT /doctor/preferences` {booking_mode, accepts_bookings, min_cancellation_hours, lead_time_minutes, horizon_days, buffer_minutes}
- `GET|POST /doctor/services` ; `PUT|DELETE /doctor/services/{id}`
- `GET|PUT /doctor/schedules` (full weekly replace: [{clinic_branch_id?, day_of_week, starts_at, ends_at, breaks:[{starts_at,ends_at}]}])
- `GET|POST /doctor/exceptions` ; `DELETE /doctor/exceptions/{id}`
- `GET /doctor/dashboard` → counts + today list
- `GET /doctor/appointments?from&to&status&page` (calendar range)
- `POST /appointments/{id}/confirm|reject|complete|no-show|cancel`
- `GET /doctor/branches` (affiliations) ; `POST /doctor/practice` (create personal clinic+branch)
- Volunteer: `GET|PUT /doctor/volunteer` {opt_in, specialties[], locations[], accepts_online, accepts_in_person, max_concurrent_requests} ; `POST /doctor/volunteer/availability` {kind:now|tonight|scheduled, starts_at?, ends_at?, hours?, mode} ; `DELETE /doctor/volunteer/availability` (go unavailable)
- `GET /doctor/urgent-requests?status` (dispatched to me) ; `GET /urgent-requests/{id}` (redacted until accepted) ; `POST /urgent-requests/{id}/accept` (409 if taken) ; `POST /urgent-requests/{id}/decline` ; `POST /urgent-requests/{id}/start|complete`

## Clinic (membership required; `{clinic}` scoped)
- `POST /clinics` (create org; caller becomes owner) ; `GET /my/clinics`
- `GET|PUT /clinics/{clinic}/manage` (details)
- `GET|POST /clinics/{clinic}/branches` ; `PUT|DELETE /clinics/{clinic}/branches/{branch}` ; `PUT /clinics/{clinic}/branches/{branch}/hours`
- `GET|POST /clinics/{clinic}/staff` {email, role} ; `PUT|DELETE /clinics/{clinic}/staff/{membership}`
- `GET|POST /clinics/{clinic}/doctors` {doctor_email|doctor_id, branch_id} ; `DELETE /clinics/{clinic}/doctors/{affiliation}`
- `GET /clinics/{clinic}/services`
- `GET /clinics/{clinic}/appointments?branch&doctor&from&to&status&page` ; `GET /clinics/{clinic}/appointments/{appointment}`
- `POST /clinics/{clinic}/appointments` {doctor_id, service_id, starts_at, patient_email|new patient {name,phone,email}}
- `POST /clinics/{clinic}/appointments/{appointment}/(confirm|cancel|complete|no-show)`
- `GET /clinics/{clinic}/reports?from&to`
- `GET /clinics/{clinic}/schedules?doctor` (read doctor schedules at clinic branches)

## Admin (role: admin)
- `GET /admin/stats?from&to`
- `GET /admin/users?q&role&status` ; `PUT /admin/users/{id}/status` {status, reason}
- `GET /admin/doctors?verification_status&q` ; `GET /admin/doctors/{id}` (incl. documents) ; `POST /admin/doctors/{id}/(approve|reject|suspend|reinstate)` {notes}
- `GET /admin/doctors/{id}/documents/{doc}/download`
- `GET|POST /admin/specialties` ; `PUT|DELETE /admin/specialties/{id}`
- `GET /admin/clinics` ; `PUT /admin/clinics/{id}/status`
- `GET /admin/appointments?…` ; `POST /admin/appointments/{id}/cancel`
- `GET /admin/reviews?status` ; `GET /admin/review-reports?status` ; `POST /admin/reviews/{id}/(hide|restore)` ; `POST /admin/review-reports/{id}/(resolve|dismiss)`
- `GET /admin/urgent-requests?status` ; `GET /admin/urgent-requests/{id}`
- `GET /admin/audit-logs?action&actor&from&to`
- `GET|PUT /admin/settings`
- `GET /admin/reports/appointments?from&to&group_by=day|specialty|clinic`

## Broadcasting (optional real-time)
Private channels: `App.Models.User.{id}` (notifications), `urgent-request.{id}` (patient owner +
dispatched doctors). Events: `UrgentRequestDispatched`, `UrgentRequestAccepted`,
`UrgentRequestStatusChanged`, `AppointmentStatusChanged`.
