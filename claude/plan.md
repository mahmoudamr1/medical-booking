# MEDICAL BOOKING PLATFORM
## Software Requirements Specification (SRS), System Architecture & AI Implementation Master Prompt

**Project Type:** Healthcare Appointment Booking & Medical Services Marketplace  
**Working Project Name:** Medical Booking  
**Business Model Reference:** CliniDo  
**Frontend:** Next.js 16 + React 19 + TypeScript  
**Backend:** Laravel 13 + PHP 8.4  
**Database:** PostgreSQL 18  
**Cache / Queue:** Redis  
**Architecture:** Modular Monolith + RESTful API  
**Primary Market:** Egypt  
**Default Language:** Arabic (RTL) with English (LTR) support  
**Default Timezone:** Africa/Cairo  
**Currency:** EGP  

---

# PART 1: MASTER INSTRUCTIONS TO THE CODING AGENT

## 1. Your Role

You are acting as a Senior Software Engineer, Backend Architect, Database Engineer, Frontend Engineer, QA Engineer, and Technical Lead.

Your responsibility is to analyze, design, implement, test, and complete a production-oriented healthcare appointment booking platform.

This is not a prototype made of static pages. It is not a UI-only project. It is not an academic CRUD demonstration.

You must implement a functional system with real business logic, a properly structured database, secure APIs, role-based authorization, reliable appointment scheduling, and fully connected frontend features.

You must work autonomously through the implementation phases until all defined requirements are implemented and verified.

Do not consider a feature complete because:
- Its page exists.
- Its button is clickable.
- Its API returns a successful response.
- Its database table has been created.
- Its frontend displays mock data.

A feature is complete only when its complete business workflow works, its permissions are enforced, its data is persisted correctly, and appropriate tests pass.

## 2. Mandatory Development Behavior

Before changing anything:

1. Inspect the complete existing repository.
2. Read README files, project instructions, Cursor rules, environment examples, and package configurations.
3. Identify the existing frontend architecture and reusable components.
4. Identify existing routes, layouts, design tokens, components, and API integrations.
5. Determine whether a backend already exists.
6. Identify incomplete or broken functionality.
7. Prepare an implementation plan based on the actual repository, not assumptions.
8. Preserve existing working functionality unless a change is necessary and justified.

Do not replace an existing working application with a new generic starter template.

Do not change the frontend architecture just because another approach is more familiar.

If the existing frontend uses Next.js 16 and React 19, preserve those versions unless a verified compatibility problem requires an upgrade.

### Engineering rules

- No hardcoded production data.
- No fake API responses presented as real functionality.
- No duplicated business logic across controllers.
- No authorization implemented exclusively in the frontend.
- No business rules implemented only in React components.
- No direct database operations scattered throughout controllers.
- No unvalidated request data.
- No insecure file uploads.
- No exposed secrets or credentials.
- No unnecessary abstractions.
- No excessive service classes that merely forward calls.
- No giant controllers containing multiple business domains.
- No circular dependencies.
- No silent exception handling.
- No deleting existing functionality without documenting the reason.
- No declaring completion without executing the tests and build checks.

Prefer simple, maintainable engineering over unnecessary architectural complexity.

Use modular architecture with clear responsibilities. Do not introduce microservices unless a real requirement justifies them.

## 3. Project Architecture

Use a Modular Monolith.

The frontend and backend must be separate applications, communicating through a versioned REST API.

Recommended repository structure:

```text
medical-booking/
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── features/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── services/
│   │   ├── types/
│   │   └── ...
│   ├── public/
│   └── package.json
│
├── backend/
│   ├── app/
│   │   ├── Actions/
│   │   ├── Enums/
│   │   ├── Events/
│   │   ├── Http/
│   │   │   ├── Controllers/
│   │   │   ├── Middleware/
│   │   │   ├── Requests/
│   │   │   └── Resources/
│   │   ├── Jobs/
│   │   ├── Models/
│   │   ├── Notifications/
│   │   ├── Policies/
│   │   ├── Services/
│   │   └── ...
│   ├── bootstrap/
│   ├── database/
│   │   ├── factories/
│   │   ├── migrations/
│   │   └── seeders/
│   ├── routes/
│   │   ├── api.php
│   │   └── ...
│   ├── tests/
│   └── composer.json
│
├── infrastructure/
│   └── docker-compose.yml
│
├── docs/
│   ├── architecture.md
│   ├── database-schema.md
│   ├── api-documentation.md
│   ├── business-rules.md
│   ├── security.md
│   └── setup.md
│
├── .gitignore
└── README.md
```

Adapt the structure if the current repository already follows a different valid structure.

The backend must own all authoritative business rules.

The frontend must never be treated as a trusted source of business decisions.

---

# PART 2: TECHNOLOGY STACK

## 4. Backend Technology

Use:

- PHP 8.4.
- Laravel 13.
- Laravel Sanctum.
- Laravel Eloquent ORM.
- Laravel Form Requests.
- Laravel API Resources.
- Laravel Policies and Middleware.
- Laravel Events and Listeners.
- Laravel Queues and Jobs.
- Laravel Notifications.
- Laravel Scheduler.
- Laravel Reverb for real-time communication when needed.
- PHPUnit for automated testing.

Use official Laravel features before introducing external packages.

### Laravel responsibilities

Laravel must handle:

- Authentication.
- Authorization.
- User management.
- Doctor verification.
- Clinic management.
- Medical specialties.
- Doctor availability.
- Appointment generation.
- Appointment booking.
- Cancellation.
- Rescheduling.
- Urgent medical requests.
- Volunteer doctor matching.
- Notifications.
- Reviews and ratings.
- Administrative operations.
- Reporting and statistics.
- Audit logging.
- Database transactions.
- Data validation.
- API error handling.

### Backend design rules

Use:

**Controllers:** Receive HTTP requests and return responses.

**Form Requests:** Validate incoming data and authorization-related request constraints.

**Services / Actions:** Contain reusable business workflows and complex business rules.

**Models:** Define relationships, casts, scopes, and model-level behavior.

**Policies:** Control access to resources.

**Resources:** Control API response serialization.

**Events:** Represent important domain events.

**Jobs:** Execute background operations.

Controllers must remain thin.

Do not put complex appointment logic directly inside controller methods.

## 5. Frontend Technology

Keep the existing Next.js 16 and React 19 application where available.

Use:

- Next.js App Router.
- React 19.
- TypeScript with strict mode.
- Tailwind CSS.
- Existing UI component library if one is already present.
- React Hook Form for complex forms.
- Zod for frontend form validation.
- TanStack Query for server-state management if appropriate to the existing application.
- A suitable date/time library for schedule handling.
- Lucide or the project's existing icon library, without introducing duplicate icon systems.

Use reusable, accessible components.

The frontend must support:
- Arabic.
- English.
- RTL.
- LTR.
- Mobile.
- Tablet.
- Desktop.
- Loading states.
- Empty states.
- Error states.
- Success feedback.
- Confirmation dialogs.

Do not build the entire application as one large page.

Organize features by domain.

## 6. Authentication Integration

Use Laravel Sanctum with first-party cookie-based SPA authentication.

Requirements:

- Secure HTTP-only session cookies.
- CSRF protection.
- Correct CORS configuration.
- Stateful domain configuration.
- Session expiration.
- Logout and session invalidation.
- Password hashing using Laravel's secure hashing services.
- Password reset.
- Email verification where configured.

The frontend and API must share the same top-level domain in production for Sanctum's SPA cookie authentication.

For local development, configure consistent hostnames and credentials-enabled CORS.

Do not place session credentials or bearer tokens in localStorage.

For protected server-rendered pages, use a secure server-side forwarding mechanism when needed. Do not expose session cookies to frontend JavaScript.

The backend must independently authorize every protected operation.

---

# PART 3: BUSINESS MODEL AND USERS

## 7. Platform Business Model

The platform is a two-sided healthcare marketplace.

It connects:

1. Patients looking for medical services.
2. Independent doctors.
3. Doctors working within clinics.
4. Clinics and medical centers.
5. Clinic owners and authorized staff.
6. Volunteer doctors who opt into urgent assistance.
7. Platform administrators.

It must support independent doctors and multi-doctor medical organizations.

A doctor may work in more than one clinic or branch.

A clinic may manage several doctors and branches.

Patients use one global account and are not restricted to one clinic.

The platform is the intermediary that facilitates discovery and booking. It does not replace medical providers or independently provide medical diagnoses.

## 8. User Roles and Permissions

Do not implement the entire platform using a single `role` string on the user table.

Use a proper role and permission structure that supports users with multiple roles.

### A. Guest

Can:

- Browse public specialties.
- Browse verified doctors.
- Browse clinics.
- View public doctor profiles.
- View public ratings.
- Search available services.
- View public booking information.
- Access the login and registration pages.

Cannot:

- Book appointments.
- View patient information.
- Access dashboards.
- Submit protected medical requests.

### B. Patient

Can:

- Register and log in.
- Manage personal profile.
- Search doctors.
- Filter doctors.
- View available appointments.
- Book appointments.
- View booking history.
- Cancel appointments according to policy.
- Request rescheduling.
- Receive notifications.
- Submit ratings after eligible completed visits.
- Submit urgent requests.
- Manage consent preferences.
- View their own medical attachments if enabled.

Cannot:

- View another patient's information.
- Modify doctor schedules.
- Confirm appointments on behalf of doctors.
- Access clinic management functionality.

### C. Doctor

Can:

- Manage doctor profile.
- Submit verification documents.
- Manage specialties where authorized.
- Configure medical services.
- Set consultation duration.
- Configure working hours.
- Add breaks.
- Add unavailable dates.
- Open or close booking temporarily.
- View personal appointments.
- Confirm or reject requests when manual confirmation is enabled.
- Complete appointments.
- View permitted patient information related to their appointments.
- Receive notifications.
- Opt into volunteer services.
- Manage urgent availability.
- Review appointment history.

Cannot:

- Modify another doctor's profile.
- Access unrelated patients.
- Access platform administration.
- Approve their own verification documents.

Only verified and active doctors can be displayed publicly or receive urgent requests.

### D. Clinic Owner / Organization Administrator

Can:

- Create and manage clinic organization details.
- Manage branches.
- Invite clinic staff.
- Assign authorized roles.
- Manage affiliated doctors.
- Configure branch working hours.
- Configure clinic services.
- View appointments belonging to their organization.
- Manage branch availability.
- View organization reports.
- Suspend local staff membership.

Must not access information belonging to unrelated organizations.

### E. Receptionist / Clinic Staff

Can, according to assigned permissions:

- View clinic appointments.
- Create bookings on behalf of patients when authorized.
- Confirm or cancel bookings where permitted.
- Manage reception workflows.
- View doctor schedules within their assigned clinic.
- Update operational appointment statuses.

Cannot:

- Modify platform settings.
- Verify doctors.
- Access all patient medical data by default.
- Access another clinic.

### F. Platform Administrator

Can:

- Manage all users.
- Review doctor verification applications.
- Approve, reject, or suspend doctors.
- Manage specialties.
- Manage clinics and branches.
- Review platform appointments.
- Review and moderate reports.
- Manage volunteer program rules.
- View platform analytics.
- Manage platform settings.
- Review audit events.
- Suspend abusive accounts.

Critical administrator actions must be logged.

---

# PART 4: MAIN FUNCTIONAL REQUIREMENTS

## 9. Patient-Facing Application

Implement the following pages and workflows.

### 9.1 Homepage

Must include:

- Main search section.
- Medical specialty categories.
- Recommended verified doctors.
- Doctors with available appointments.
- Featured clinics.
- Popular medical services.
- Urgent assistance section.
- How the platform works.
- Registration and sign-in entry points.
- Footer with policies and contact information.

The homepage must use real database content.

### 9.2 Medical Specialties

Create a manageable specialty directory.

Examples:

- Cardiology.
- Dermatology.
- Pediatrics.
- Orthopedics.
- Ophthalmology.
- ENT.
- Neurology.
- Psychiatry.
- General Surgery.
- Gynecology.
- Internal Medicine.
- Dentistry.
- Urology.
- General Practice.

Each specialty must support:

- Arabic name.
- English name.
- Description.
- Icon or image.
- Active status.
- Display ordering.
- SEO-friendly slug.

Do not hardcode specialties directly inside components.

### 9.3 Doctor Discovery and Search

The patient must be able to search and discover doctors using:

- Doctor name.
- Specialty.
- Subspecialty where supported.
- Governorate.
- City.
- Area.
- Clinic.
- Price range.
- Rating.
- Available dates.
- Consultation type.
- Verified status.

Doctor cards should display:

- Profile image.
- Doctor name.
- Professional title.
- Specialty.
- Experience.
- Rating and review count.
- Consultation price where applicable.
- Clinic or branch.
- Next available appointment.
- Booking action.

Only active, verified doctors are publicly discoverable.

Search results must be paginated.

Filters must be applied by the backend, not only by filtering an already loaded frontend array.

### 9.4 Doctor Profile

Every public doctor profile should contain:

- Professional image.
- Full name.
- Professional title.
- Qualifications.
- Experience.
- Medical specialties.
- Professional biography.
- Verification badge.
- Associated clinics.
- Clinic branches.
- Consultation types.
- Prices.
- Appointment durations.
- Available schedule.
- Patient reviews.
- Average rating.
- Location information.
- Booking CTA.

Private verification information must never appear in public API responses.

### 9.5 Clinic Directory

Patients must be able to:

- Browse clinics.
- Search by name.
- Filter by location.
- View branches.
- View affiliated doctors.
- View available services.
- View clinic contact information.
- Book eligible services.

A clinic can have multiple branches.

Each branch must have its own address, operational hours, and available services.

### 9.6 Appointment Booking Flow

This is one of the most important workflows in the project.

Required sequence:

1. Patient chooses a specialty.
2. Patient selects a doctor.
3. Patient views the doctor profile.
4. Patient selects the clinic or service location where applicable.
5. Patient chooses a date.
6. System fetches actual available appointments.
7. Patient chooses an available time.
8. System revalidates availability on the backend.
9. Patient confirms the booking.
10. Backend creates the appointment within a database transaction.
11. System confirms the successful reservation.
12. Patient and doctor receive notifications.

Booking must never depend on frontend availability alone.

A displayed available time is only an availability snapshot. The backend must revalidate it during booking.

### 9.7 Appointment Management

Patients must have an appointments dashboard.

Separate:

- Upcoming appointments.
- Pending appointments.
- Completed appointments.
- Cancelled appointments.

Each booking must provide:

- Booking reference.
- Doctor.
- Specialty.
- Clinic.
- Date.
- Start time.
- End time.
- Appointment type.
- Price.
- Status.
- Booking creation time.

Patients must be able to cancel within the configured cancellation policy.

Rescheduling must check the new appointment slot before modifying the original booking.

If the new booking cannot be created, the original booking must remain intact.

---

# PART 5: DOCTOR AND CLINIC MANAGEMENT

## 10. Doctor Dashboard

Build an actual working dashboard.

Required sections:

### Overview

- Today's appointments.
- Upcoming appointments.
- Completed appointments.
- Cancelled appointments.
- Pending confirmations.
- Average patient rating.

### Appointment Calendar

- Daily view.
- Weekly view.
- Monthly view.
- Appointment details.
- Available periods.
- Unavailable periods.
- Status indicators.

### Schedule Management

Doctor must be able to configure:

- Weekly working days.
- Start time.
- End time.
- Break periods.
- Appointment duration.
- Buffer time between appointments.
- Temporary booking closure.
- Exceptional working days.
- Holidays.
- Specific unavailable dates.
- Booking lead time.
- Maximum booking horizon.

Each schedule must have a clearly defined timezone.

### Doctor Profile Management

Doctor can edit public professional details, but modifications to verified identity and credentials must be handled through an administrator-controlled verification workflow.

### Booking Preferences

Support:

- Instant booking.
- Manual confirmation when configured.
- Service-specific durations.
- Different prices for different branches or services.
- Minimum cancellation notice.

## 11. Clinic Dashboard

Implement:

- Organization overview.
- Branch management.
- Doctor management.
- Staff management.
- Service management.
- Appointment management.
- Branch schedules.
- Clinic reports.
- Organization settings.

Organization users must be scoped to their organization.

Use authorization policies and tenant scoping at the backend level.

Do not rely on frontend filtering to enforce tenant isolation.

---

# PART 6: APPOINTMENT ENGINE

## 12. Core Scheduling Rules

The scheduling system must be designed as a real booking engine.

### Required appointment states

Use explicit backend enums.

Recommended states:

- `confirmed`
- `pending_confirmation`
- `completed`
- `cancelled_by_patient`
- `cancelled_by_doctor`
- `cancelled_by_clinic`
- `rejected`
- `expired`
- `no_show`

Use well-defined state transitions.

Do not allow arbitrary status changes.

For example:

- A completed appointment cannot become pending.
- A cancelled appointment cannot be completed without an authorized correction workflow.
- A doctor cannot confirm an appointment belonging to another doctor.
- A patient cannot complete an appointment themselves.

### 12.1 Variable Appointment Duration

Appointment duration must be configurable.

Example:

- Doctor A: 15 minutes.
- Doctor B: 20 minutes.
- Doctor C: 30 minutes.
- A particular service: 45 minutes.

Do not assume that every appointment is 30 minutes.

Calculate appointment end time using the selected service's configured duration.

Include optional buffer time before or after appointments.

### 12.2 Availability Calculation

Generate availability from:

- Weekly schedules.
- Schedule exceptions.
- Breaks.
- Doctor availability.
- Branch schedules.
- Service duration.
- Buffer time.
- Existing active appointments.
- Booking policies.

Do not generate slots that are:
- In the past.
- Outside working hours.
- During breaks.
- During unavailable periods.
- Already occupied.
- Shorter than the required appointment duration.
- Outside the configured booking horizon.

Prefer calculating slots dynamically instead of storing millions of future available slots.

### 12.3 Double Booking Prevention

This is a mandatory database-level requirement.

Two patients must never successfully reserve overlapping appointments with the same doctor.

Do not attempt to solve this using frontend checks.

Do not rely on a simple `SELECT available` followed by `INSERT`.

Implement:

1. Database transactions.
2. Database-enforced overlap protection.
3. Correct appointment status handling.
4. Conflict responses.
5. Concurrency tests.

Because PostgreSQL is the selected database, evaluate an exclusion constraint using `btree_gist` and a half-open timestamp range:

`[start_at, end_at)`

The constraint should prevent overlapping active appointments for the same doctor while ignoring genuinely inactive states.

A short-lived booking hold must become expired before it stops blocking an appointment.

If using manual confirmation, the pending reservation must still block the selected period.

Use a transaction to:

- Expire eligible stale holds for the relevant doctor.
- Validate the appointment.
- Create the reservation.
- Persist its status.
- Commit the transaction.

If a concurrent request conflicts, return HTTP 409 with a meaningful error.

Use a database-level constraint as the final protection even when application-level checks exist.

The implementation must be tested with concurrent requests using separate database connections.

### 12.4 Cancellation

Implement:

- Patient cancellation.
- Doctor cancellation.
- Clinic cancellation.
- Administrator cancellation.

Record:

- Who cancelled.
- Cancellation reason.
- Cancellation timestamp.
- Previous status.
- Resulting status.

Do not delete appointment records when cancelled.

### 12.5 Rescheduling

Rescheduling must be atomic.

The system must validate and secure the new period before permanently releasing the previous booking.

Do not leave a patient without their original appointment because a new appointment could not be booked.

### 12.6 Appointment Audit History

Record important appointment events:

- Creation.
- Confirmation.
- Rejection.
- Cancellation.
- Rescheduling.
- Completion.
- No-show.

Store the actor and timestamp for every transition.

---

# PART 7: VOLUNTEER DOCTORS AND URGENT ASSISTANCE

## 13. Dedicated Urgent Assistance Module

This is a distinguishing module in our platform.

Its purpose is to connect patients with verified volunteer doctors when a regular appointment is not suitable, particularly during late hours or in urgent situations.

However, it must be designed carefully.

**Urgent appointment assistance is not a replacement for ambulance services, emergency departments, or emergency medical care.**

The platform must distinguish two different situations.

### 13.1 Situation A: Urgent Medical Consultation

Examples:

- A patient needs an earlier appointment than the available regular schedule.
- A patient needs a doctor late at night.
- A patient needs an urgent specialty consultation.
- A patient has an urgent but non-life-threatening concern.
- A patient wants to contact an available volunteer doctor.

This is the primary workflow of our volunteer system.

### 13.2 Situation B: Life-Threatening Medical Emergency

Examples may include severe breathing difficulty, unconsciousness, suspected stroke, severe chest pain, or severe uncontrolled bleeding.

Do not route these cases through the normal volunteer matching process.

Immediately display a clear emergency warning:

"هذه المنصة ليست خدمة إسعاف. إذا كانت الحالة مهددة للحياة، اتصل بالإسعاف فورًا أو توجه إلى أقرب قسم طوارئ."

For Egypt, provide the ambulance number 123 as a configurable emergency contact, with operational verification before production deployment.

The system must not make a patient wait for a volunteer response in a life-threatening emergency.

Do not implement an AI diagnosis or automated medical triage system.

### 13.3 Volunteer Doctor Registration

Doctors can optionally register as volunteers.

A volunteer profile must support:

- Volunteer status.
- Verification status.
- Supported specialties.
- Governorates.
- Cities and areas.
- Service coverage radius when applicable.
- Available days.
- Available time periods.
- Late-night availability.
- Consultation mode.
- Maximum requests handled.
- Active / inactive state.
- Last availability update.

A doctor must explicitly opt into the volunteer program.

Being a verified doctor must not automatically make them available for emergency or urgent requests.

Only verified, active, opted-in doctors are eligible for matching.

### 13.4 Volunteer Availability Management

Doctor must be able to control:

- Available now.
- Unavailable.
- Available tonight.
- Available during specific hours.
- Available for online consultation.
- Available for in-person consultations where supported.
- Available in specific locations.

Availability must be time-bounded and automatically expire.

Do not consider a doctor available forever because they once enabled a checkbox.

### 13.5 Patient Urgent Request Flow

The patient sees a clearly visible urgent assistance section.

Workflow:

1. Patient opens urgent assistance.
2. Platform explains when this service is appropriate.
3. Patient acknowledges that it is not an ambulance service.
4. Patient selects the medical specialty if known.
5. Patient enters a brief description.
6. Patient selects the preferred consultation type.
7. Patient provides the required location information.
8. Patient grants consent for the required information to be shared with matched volunteer doctors.
9. System searches eligible doctors.
10. System sends notifications to eligible doctors.
11. Doctors may accept or decline.
12. The first eligible acceptance wins atomically.
13. Patient receives the accepted doctor's information.
14. The request moves into the consultation workflow.

Collect only information needed for matching and consultation.

Do not require a patient to disclose extensive medical history before requesting help.

### 13.6 Volunteer Matching Logic

Match based on:

- Doctor verification.
- Active volunteer state.
- Specialty.
- Geographic coverage.
- Current availability.
- Consultation mode.
- Current active workload.
- Doctor's acceptance preferences.

A reasonable matching flow:

**First group:** Doctors in the requested specialty and nearby coverage area.

**Second group:** Doctors in the same specialty within a wider eligible area.

**Third group:** Other eligible general practitioners when the patient's requested specialty does not have available volunteers, with clear disclosure that they are general practitioners.

Do not assign a doctor automatically without their acceptance.

### 13.7 Urgent Request Statuses

Recommended statuses:

- `created`
- `searching`
- `notifying`
- `accepted`
- `in_progress`
- `completed`
- `cancelled`
- `unmatched`
- `expired`

Use a separate entity from normal appointments.

### 13.8 Prevent Multiple Doctors From Accepting the Same Request

This must be enforced on the backend using an atomic database transaction.

Two doctors may receive the same notification.

Only one may successfully accept.

Use a conditional update or row-level locking, ensuring the request is still in an eligible status.

If another doctor already accepted, return a conflict response and update the losing doctor's UI.

### 13.9 Matching Timeouts and Escalation

Implement configurable timeouts.

Example starting configuration:

- First notification group: 60 seconds.
- Second notification group: 90 seconds.
- Final availability check: 60 seconds.

These are operational defaults, not guaranteed response times.

If nobody accepts:

- Set the request to `unmatched`.
- Inform the patient that no volunteer is currently available.
- Offer regular booking alternatives.
- Remind the patient of the emergency services warning.

Never display a fake guarantee that a doctor will respond.

### 13.10 Privacy Rules

- Do not expose the patient's phone number to every doctor who receives a notification.
- Do not expose exact location unless needed and authorized.
- Reveal necessary contact details only after acceptance and consent.
- Use private channels for notifications.
- Log the doctor who accessed the request.
- Expire unnecessary location data.
- Apply rate limits to urgent request creation.
- Provide reporting for abuse.

### 13.11 Real-Time Notifications

Use Laravel Queues for notification delivery.

Use Laravel Reverb or an equivalent secure real-time mechanism for updates when configured.

Required events:

- New urgent request.
- Doctor notification.
- Doctor acceptance.
- Acceptance conflict.
- Request expiration.
- Patient status update.

Private channels must authorize each participant.

The platform must work correctly even if real-time delivery temporarily fails. Use persistent request state and fallback refresh/polling.

---

# PART 8: DATABASE ENGINEERING

## 14. PostgreSQL Database Design

Use PostgreSQL as the primary relational database.

Do not use JSON columns as a substitute for proper relational design.

JSONB is allowed for flexible, non-core metadata when justified.

Use:

- Primary keys.
- Foreign keys.
- Unique constraints.
- Check constraints.
- Appropriate NOT NULL rules.
- Cascading behavior only when appropriate.
- Database transactions.
- Indexes.
- Database migrations.

Use a consistent naming convention.

Use internal BIGINT primary keys or UUIDs consistently, with a public UUID/ULID identifier for API resources where useful.

Do not expose predictable internal IDs as a security boundary.

### 14.1 Required Database Entities

Design the ERD and migrations around the following domain entities.

#### Identity and access

- `users`
- `roles`
- `permissions`
- `user_roles`
- `role_permissions`
- `patient_profiles`
- `doctor_profiles`

#### Medical directory

- `specialties`
- `doctor_specialties`
- `clinics`
- `clinic_memberships`
- `clinic_branches`
- `doctor_branch_affiliations`
- `medical_services`

#### Scheduling

- `doctor_schedules`
- `schedule_breaks`
- `schedule_exceptions`
- `appointments`
- `appointment_status_histories`

#### Reviews

- `reviews`
- `review_reports`

#### Urgent assistance

- `volunteer_profiles`
- `volunteer_specialties`
- `volunteer_locations`
- `volunteer_availabilities`
- `urgent_requests`
- `urgent_request_dispatches`

#### Notifications and security

- `notifications`
- `audit_logs`
- `consents`
- `password_reset_tokens`
- `personal_access_tokens` if token-based integrations are separately required.

Use Laravel's standard supporting tables where appropriate.

### 14.2 Important Relationships

- One user may have multiple roles.
- One user may have a patient profile.
- One user may have a doctor profile.
- One doctor may have multiple specialties.
- One clinic may have multiple branches.
- One doctor may belong to multiple clinics.
- One clinic may have multiple staff members.
- One doctor may have multiple schedule records.
- One patient may have multiple appointments.
- One doctor may have multiple appointments.
- One completed appointment may have one eligible review.
- One urgent request may have multiple dispatch attempts.
- One urgent request may have only one winning volunteer acceptance.

Do not duplicate the same information unnecessarily across tables.

### 14.3 Multi-Tenant Data Isolation

Clinics and medical organizations must be isolated from one another.

Use an explicit organization/tenant relationship.

Tenant-owned records must carry or be traceable to their owning organization.

Global platform-level data such as specialties and global patient accounts must remain separate from tenant-owned resources.

All clinic management queries must enforce tenant scoping.

A clinic user must not be able to read, update, or delete another clinic's data by changing an identifier in an API request.

Implement and test cross-tenant access prevention.

### 14.4 Database Indexing Strategy

Index based on actual query patterns.

Do not add random indexes to every column.

Recommended examples:

- `users.email` unique index.
- `users.phone` unique index when phone uniqueness is required.
- `doctor_profiles.user_id` unique index.
- `doctor_profiles.verification_status`.
- `doctor_specialties.specialty_id`.
- `doctor_specialties.doctor_profile_id`.
- `clinic_branches.clinic_id`.
- `clinic_branches.city_id` or location fields.
- `appointments.doctor_profile_id`.
- `appointments.patient_profile_id`.
- `appointments.starts_at`.
- `appointments.status`.
- `appointments.doctor_profile_id, starts_at`.
- `reviews.doctor_profile_id`.
- `urgent_requests.status`.
- `urgent_request_dispatches.doctor_profile_id`.
- `urgent_request_dispatches.urgent_request_id`.

Use composite indexes when queries filter or sort on multiple columns.

Example query pattern:

Appointments belonging to a doctor, within a date range, ordered by start time.

Design the index to support that query.

### 14.5 Search Indexing

Start with PostgreSQL-native search.

Evaluate:

- B-tree indexes for equality, sorting, and range queries.
- GIN for full-text or array searches where suitable.
- pg_trgm for fuzzy matching and partial-name searches.
- Normalized search fields for Arabic and English names.

Consider Arabic text normalization:

- Normalize common letter variations where appropriate.
- Normalize diacritics.
- Normalize whitespace.
- Avoid destructive normalization of stored display names.
- Preserve original user-facing text.

Do not introduce Elasticsearch just for basic doctor discovery.

Do not introduce a second search engine unless query performance or search quality genuinely requires it.

Use `EXPLAIN ANALYZE` to investigate expensive queries.

Do not optimize based on assumptions alone.

### 14.6 Data Integrity

Critical rules must be enforced in the database wherever possible.

Examples:

- Unique email where required.
- Valid doctor profile ownership.
- Valid foreign keys.
- Non-negative prices.
- Valid appointment periods.
- One eligible review per appointment.
- No overlapping active appointments for the same doctor.
- Valid urgent request acceptance state.

A missing frontend validation must never allow invalid data to enter the database.

---

# PART 9: API DESIGN

## 15. API Standards

All business APIs should use:

`/api/v1/...`

Use RESTful naming.

Example:

`GET /api/v1/doctors`

`GET /api/v1/doctors/{doctor}`

`GET /api/v1/doctors/{doctor}/availability`

`POST /api/v1/appointments`

`GET /api/v1/patient/appointments`

`POST /api/v1/urgent-requests`

Use API Resources for responses.

Use Form Requests for validation.

Implement pagination and filtering consistently.

### Standard HTTP responses

- `200`: Successful read or update.
- `201`: Resource created.
- `204`: Successful deletion or empty response.
- `400`: Invalid request structure.
- `401`: Unauthenticated.
- `403`: Forbidden.
- `404`: Resource not found.
- `409`: Business conflict, such as unavailable booking.
- `422`: Validation errors.
- `429`: Rate limit exceeded.
- `500`: Unexpected server error.

Do not return database stack traces to the client.

Use a consistent response structure.

Example:

```json
{
  "success": true,
  "message": "Appointment booked successfully",
  "data": {
    "id": "public-booking-id",
    "status": "confirmed"
  }
}
```

For validation errors:

```json
{
  "success": false,
  "message": "The submitted data is invalid",
  "errors": {
    "starts_at": [
      "The selected appointment is no longer available."
    ]
  }
}
```

Adapt the exact response contract consistently across the API.

### Minimum API Modules

Authentication:
- Register.
- Login.
- Logout.
- Current user.
- Password reset.
- Email verification.

Public directory:
- Specialties.
- Doctors.
- Clinics.
- Branches.
- Search.
- Availability.

Patient:
- Profile.
- Appointments.
- Cancellation.
- Rescheduling.
- Reviews.
- Urgent requests.
- Notifications.

Doctor:
- Profile.
- Verification submission.
- Schedule.
- Appointment management.
- Booking preferences.
- Volunteer availability.

Clinic:
- Organization details.
- Branches.
- Staff.
- Doctors.
- Services.
- Schedules.
- Appointments.

Admin:
- Users.
- Doctor verification.
- Specialties.
- Clinics.
- Appointments.
- Urgent request oversight.
- Reports.
- Audit logs.
- Platform settings.

---

# PART 10: SECURITY AND PRIVACY

## 16. Mandatory Security Requirements

Healthcare information is sensitive.

Treat security and privacy as core functionality, not a final checklist.

### Authentication

- Secure password hashing.
- Secure session management.
- CSRF protection.
- Login rate limiting.
- Password reset security.
- Session invalidation.
- Secure cookies.
- Email verification where configured.

### Authorization

Use backend policies and explicit permissions.

Every resource must be checked for ownership and authorization.

Never rely on hidden frontend buttons as access control.

### Input validation

Validate:

- Names.
- Emails.
- Phone numbers.
- Dates.
- Times.
- Prices.
- IDs.
- Uploaded files.
- Descriptions.
- Search parameters.

### File uploads

For doctor verification documents and private attachments:

- Allow only approved file types.
- Validate actual MIME type.
- Restrict file sizes.
- Generate safe server-side filenames.
- Store sensitive files in private storage.
- Never expose private documents through public URLs.
- Check ownership on every file access.
- Avoid executable file uploads.
- Keep uploads outside publicly executable directories.

### Data protection

- Use HTTPS in deployment.
- Protect database credentials.
- Use environment variables.
- Encrypt sensitive information at rest when appropriate.
- Avoid unnecessary sensitive fields.
- Restrict access to health-related information.
- Maintain audit logs for sensitive access.
- Use secure backups.
- Define data retention rules.
- Implement consent records.
- Support correction and deletion requests where legally applicable.

### Egyptian Legal Context

Review Egypt's Personal Data Protection Law No. 151 of 2020 and its applicable executive regulations, including Ministerial Decision No. 816 of 2025.

Health information is classified as sensitive personal data under the Egyptian law.

Do not use real patient health records for development or demonstration without the necessary lawful basis, approvals, and safeguards.

The academic version should use synthetic data.

Production deployment and actual processing of sensitive health data must be reviewed with qualified legal/compliance professionals. Do not claim that merely using encryption or GDPR-inspired practices makes the platform legally compliant.

---

# PART 11: NOTIFICATIONS AND BACKGROUND PROCESSING

## 17. Notifications

Implement notifications for:

### Patient

- Successful booking.
- Booking confirmation.
- Booking cancellation.
- Rescheduling.
- Upcoming appointment reminder.
- Doctor update.
- Urgent request accepted.
- Urgent request unmatched.

### Doctor

- New appointment.
- Appointment cancellation.
- Appointment rescheduling.
- Upcoming appointment reminder.
- Verification result.
- New urgent request.
- Urgent request acceptance conflict.

### Clinic

- New booking.
- Schedule changes.
- Relevant operational alerts.

### Administrator

- Doctor verification request.
- Reported review.
- Suspicious activity.
- Volunteer program issues.

Use database-backed notifications.

Email notifications must work when SMTP is configured.

Do not assume an external SMS service is free.

Keep integrations configurable.

## 18. Queues and Scheduler

Use Laravel Jobs for:

- Appointment reminders.
- Expiring pending booking holds.
- Volunteer notifications.
- Urgent request timeout handling.
- Scheduled reports.
- Email delivery.

Use the Laravel scheduler for recurring tasks.

Jobs must be idempotent where necessary.

Implement retry strategies and failure logging.

Do not perform slow external notifications synchronously during an appointment transaction.

Persist the business event first, commit the transaction, and dispatch side effects safely after commit.

---

# PART 12: ADMIN DASHBOARD AND REPORTING

## 19. Platform Administration

The admin dashboard must provide:

### Overview statistics

- Total patients.
- Total doctors.
- Verified doctors.
- Pending doctor verification requests.
- Total clinics.
- Total appointments.
- Upcoming appointments.
- Completed appointments.
- Cancelled appointments.
- Open urgent requests.
- Unmatched urgent requests.

### Management screens

- User management.
- Doctor management.
- Verification management.
- Specialty management.
- Clinic management.
- Appointment oversight.
- Review moderation.
- Urgent request oversight.
- Reports.
- Audit logs.
- System settings.

### Statistics rules

Statistics must be calculated from actual database records.

Do not hardcode totals.

Use proper aggregation queries.

Avoid N+1 queries.

Paginate large data lists.

Apply date filters where appropriate.

---

# PART 13: UI/UX REQUIREMENTS

## 20. Product Design Principles

The product must look like a professional healthcare platform.

The design must prioritize clarity and trust.

Avoid generic AI-generated dashboard layouts that look like unrelated templates stitched together.

### Visual direction

- Clean healthcare-oriented design.
- Clear information hierarchy.
- Consistent spacing.
- Professional typography.
- Restrained medical color palette.
- Consistent buttons and form controls.
- Accessible contrast.
- Consistent component states.

### Arabic support

Arabic is a primary language, not a translated afterthought.

Implement:

- Proper RTL layout.
- Arabic-friendly typography.
- Logical alignment.
- Correct direction for icons and navigation.
- Date and number localization.
- Consistent Arabic validation messages.

Switching to English must correctly switch the interface to LTR.

### Responsiveness

All important screens must work on mobile.

Priority screens:

- Homepage.
- Doctor discovery.
- Doctor profile.
- Booking flow.
- Patient dashboard.
- Doctor calendar.
- Urgent assistance.

### State handling

Every asynchronous screen must provide:

- Loading skeleton or spinner.
- Empty state.
- Error state.
- Retry behavior where appropriate.
- Success feedback.

Never leave broken blank areas.

### Design consistency

Use shared components.

Examples:

- Button.
- Input.
- Select.
- Date picker.
- Time slot.
- Doctor card.
- Specialty card.
- Appointment card.
- Status badge.
- Modal.
- Confirmation dialog.
- Dashboard statistic card.
- Table.
- Pagination.
- Empty state.

Do not create multiple visually different versions of the same component without a meaningful requirement.

---

# PART 14: TESTING AND QUALITY ASSURANCE

## 21. Testing Strategy

The project is not complete without automated tests.

Use PHPUnit with Laravel testing facilities.

Create:

### Unit Tests

Test isolated domain rules:

- Appointment duration calculation.
- Schedule calculation.
- Cancellation policies.
- Doctor eligibility.
- Volunteer matching eligibility.
- Appointment status transitions.

### Feature Tests

Test complete API workflows:

- Registration.
- Login.
- Authentication.
- Role permissions.
- Doctor verification.
- Doctor search.
- Booking.
- Cancellation.
- Rescheduling.
- Reviews.
- Clinic isolation.
- Urgent request creation.
- Volunteer acceptance.
- Admin functions.

### Database Tests

Test:

- Foreign key constraints.
- Unique constraints.
- Appointment overlap prevention.
- Transaction rollback.
- Data integrity.
- Tenant isolation.

### Concurrency Tests

Critical acceptance criteria:

**Scenario 1:**

Two different patients attempt to book the same doctor's overlapping period simultaneously.

Expected:

- Only one successful booking.
- The other request receives a conflict response.
- No duplicate active appointment exists.

**Scenario 2:**

Two volunteer doctors accept the same urgent request simultaneously.

Expected:

- Exactly one successful acceptance.
- The other doctor receives a conflict response.
- One winning dispatch is recorded.

**Scenario 3:**

A clinic staff member attempts to access another clinic's appointment.

Expected:

- HTTP 403 or 404 according to the chosen resource-disclosure policy.
- No data leakage.

**Scenario 4:**

An unverified doctor attempts to appear in public search.

Expected:

- No public result.
- No ability to receive urgent requests.

### Frontend Testing

Test critical user flows:

- Registration.
- Login.
- Doctor search.
- Booking.
- Cancellation.
- Doctor schedule management.
- Urgent request.
- Admin verification.

Use suitable component and browser testing tools compatible with the existing stack.

## 22. Performance Requirements

Implement:

- Server-side pagination.
- Correct database indexes.
- Query optimization.
- Eager loading where appropriate.
- Avoidance of N+1 queries.
- Caching of relatively static directory data.
- Cache invalidation when relevant data changes.
- Background jobs for slow operations.
- Request rate limiting.

Use real measurements rather than arbitrary optimization.

Do not cache private patient data in a shared public cache.

---

# PART 15: DEPLOYMENT AND DEVELOPER EXPERIENCE

## 23. Local Development

Use Docker Compose where practical.

Development services:

- Frontend.
- Laravel API.
- PostgreSQL.
- Redis.

Provide a complete `.env.example`.

Never commit real `.env` files.

Document required versions and setup commands.

The project must be runnable by another developer without manually guessing missing configuration.

### Required documentation

Create:

**README.md**
- Project introduction.
- Technology stack.
- Features.
- Prerequisites.
- Installation.
- Local startup.
- Testing.
- Demo accounts.

**docs/architecture.md**
- System boundaries.
- Frontend/backend responsibilities.
- Main modules.
- Request lifecycle.
- Architecture decisions.

**docs/database-schema.md**
- Entity descriptions.
- ERD.
- Relationships.
- Constraints.
- Indexes.

**docs/api-documentation.md**
- Endpoints.
- Authentication.
- Request examples.
- Response examples.
- Error codes.

**docs/business-rules.md**
- Booking workflow.
- Scheduling rules.
- Cancellation policies.
- Volunteer eligibility.
- Urgent request lifecycle.

**docs/security.md**
- Roles.
- Permissions.
- Data handling.
- Security controls.
- Known limitations.

**docs/setup.md**
- Complete local environment instructions.

### Environment variables

Use clear environment configuration, for example:

```env
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost:8000
APP_TIMEZONE=Africa/Cairo

DB_CONNECTION=pgsql
DB_HOST=postgres
DB_PORT=5432
DB_DATABASE=medical_booking
DB_USERNAME=medical_user
DB_PASSWORD=

CACHE_STORE=redis
QUEUE_CONNECTION=redis
SESSION_DRIVER=database

REDIS_HOST=redis
REDIS_PORT=6379
```

Adjust actual values to the implemented Docker setup.

Use separate production configuration.

Never use an empty or default secret in production.

### Database setup

Provide:

- Migrations.
- Development seeders.
- Factory definitions.
- Demo accounts.
- Test data.

Seeders must be repeatable and must not create duplicate data every time they run.

Use fake medical records for development.

Do not seed real personal information.

### Deployment

Prepare a documented deployment path.

Include:

- Production environment variables.
- Database migrations.
- Queue worker.
- Scheduler.
- Storage permissions.
- HTTPS.
- Secure cookies.
- Logging.
- Backup strategy.
- Health checks.
- Debug mode disabled.

Avoid dependencies on paid commercial services for essential project functionality.

Optional integrations must have documented fallback behavior.

---

# PART 16: PROJECT IMPLEMENTATION PHASES

## 24. Required Execution Order

Do not develop random screens without establishing the domain model.

Execute in the following phases.

### Phase 0: Repository Audit

- Inspect existing code.
- Understand current frontend.
- Identify missing pieces.
- Document existing structure.
- Identify compatibility issues.
- Prepare implementation roadmap.

Deliverable: `docs/implementation-plan.md`.

### Phase 1: Backend Foundation

- Initialize Laravel 13 if missing.
- Configure PHP and dependencies.
- Configure PostgreSQL.
- Configure Redis.
- Configure CORS.
- Install Sanctum.
- Configure authentication.
- Configure API versioning.
- Establish error handling.
- Establish migrations.
- Add health check.

Acceptance: API runs, database connects, authentication works.

### Phase 2: Core Database and Domain

Implement:

- Identity.
- Roles.
- Permissions.
- Patient profile.
- Doctor profile.
- Specialties.
- Clinics.
- Branches.
- Staff memberships.
- Doctor affiliations.

Acceptance: relationships are correct, migrations work, tenant isolation tests pass.

### Phase 3: Doctor Verification and Directory

Implement:

- Doctor onboarding.
- Verification workflow.
- Specialty management.
- Doctor public profiles.
- Clinic listings.
- Search.
- Filters.
- Pagination.
- Database indexes.

Acceptance: only verified doctors appear publicly.

### Phase 4: Scheduling Engine

Implement:

- Weekly schedules.
- Breaks.
- Exceptions.
- Durations.
- Buffer periods.
- Dynamic availability.
- Appointment lifecycle.
- Double-booking protection.
- Cancellation.
- Rescheduling.
- Concurrency tests.

Acceptance: all appointment rules pass automated tests.

### Phase 5: Patient and Doctor Applications

Implement:

- Patient registration.
- Patient profile.
- Doctor dashboard.
- Appointment calendar.
- Booking UI.
- Appointment details.
- Notifications.

Acceptance: patient can book and doctor can manage real appointments.

### Phase 6: Clinic Management

Implement:

- Organization dashboard.
- Branch management.
- Staff invitations and permissions.
- Doctor affiliations.
- Branch schedules.
- Clinic appointments.

Acceptance: organizations are isolated correctly.

### Phase 7: Volunteer and Urgent Assistance

Implement:

- Volunteer opt-in.
- Doctor availability.
- Urgent requests.
- Matching.
- Dispatch attempts.
- Atomic acceptance.
- Timeout handling.
- Real-time notifications.
- Emergency warnings.
- Abuse protection.

Acceptance: concurrent volunteer acceptance test passes and life-threatening cases are directed to emergency services.

### Phase 8: Reviews and Admin

Implement:

- Eligible appointment reviews.
- Rating aggregation.
- Review moderation.
- Admin dashboards.
- Doctor verification actions.
- Platform analytics.
- Audit logs.

Acceptance: all admin operations enforce permissions and display real data.

### Phase 9: Security and QA

Execute:

- Authorization audit.
- Tenant isolation audit.
- File upload audit.
- Input validation.
- Authentication tests.
- Booking concurrency tests.
- Urgent acceptance concurrency tests.
- Frontend flow tests.
- API integration tests.
- Performance inspection.

Acceptance: all critical tests pass.

### Phase 10: Completion and Delivery

- Run all migrations from a clean database.
- Run seeders.
- Run all backend tests.
- Run frontend tests.
- Run frontend production build.
- Run backend static analysis and formatting checks where configured.
- Verify startup instructions.
- Check all critical user journeys manually.
- Complete README and technical documentation.
- Create final implementation report.

Do not mark this phase complete while critical tests are failing.

---

# PART 17: DEFINITION OF DONE

## 25. Final Completion Checklist

The project is complete only when the following conditions are met.

### Backend

- [ ] Laravel application runs.
- [ ] PostgreSQL connection works.
- [ ] Migrations execute from a clean database.
- [ ] Authentication works.
- [ ] Roles and permissions work.
- [ ] Doctor verification works.
- [ ] Doctor search works.
- [ ] Clinic isolation works.
- [ ] Scheduling works.
- [ ] Appointment booking works.
- [ ] Concurrent booking is protected.
- [ ] Cancellation works.
- [ ] Rescheduling works.
- [ ] Volunteer registration works.
- [ ] Volunteer matching works.
- [ ] Concurrent acceptance is protected.
- [ ] Notifications are persisted and delivered through configured channels.
- [ ] Admin operations work.
- [ ] Audit logging works.

### Frontend

- [ ] Existing frontend is preserved appropriately.
- [ ] Public pages work.
- [ ] Authentication pages work.
- [ ] Patient dashboard works.
- [ ] Doctor dashboard works.
- [ ] Clinic dashboard works.
- [ ] Admin dashboard works.
- [ ] Search and filters work.
- [ ] Booking flow works.
- [ ] Calendar works.
- [ ] Urgent assistance works.
- [ ] Arabic RTL works.
- [ ] English LTR works.
- [ ] Responsive layouts work.
- [ ] Loading, empty, and error states work.

### Quality

- [ ] Backend automated tests pass.
- [ ] Frontend automated tests pass.
- [ ] Production frontend build succeeds.
- [ ] No critical authorization vulnerabilities remain.
- [ ] No duplicate active doctor appointments can be created.
- [ ] No duplicate urgent request acceptance can occur.
- [ ] No real personal data is embedded in demo fixtures.
- [ ] No production secrets are committed.
- [ ] Documentation is complete.
- [ ] Local setup has been verified from a clean environment.

---

# PART 18: FINAL INSTRUCTIONS TO THE AI

You must manage implementation as an engineering delivery, not a code-generation exercise.

At the beginning, report the existing repository structure and implementation gaps.

Then execute the phases in order.

After every major phase:

1. Run relevant tests.
2. Resolve failures.
3. Check that existing features still work.
4. Update technical documentation.
5. Update the implementation checklist.

Do not repeatedly ask the user to approve routine technical decisions.

When a choice is not explicitly specified, make the simplest secure and maintainable choice consistent with this specification.

Do not install a package without checking its compatibility with the selected versions and whether its functionality is already available in Laravel or the current frontend.

Do not claim to have implemented a feature if you only created its interface.

Do not leave critical workflows using mock data.

Do not leave TODO comments in place of required business functionality.

Do not stop after producing the initial architecture, the database, or the first dashboard.

Continue through implementation, integration, testing, and documentation.

If a genuine blocker requires credentials, external service access, legal approval, or a decision that cannot safely be assumed, isolate that blocker and finish every independent task that can be completed without it. Document the exact blocker and its effect.

At final delivery, provide:

1. What was implemented.
2. The exact modules completed.
3. The database schema and migration status.
4. API documentation location.
5. Test execution results.
6. Production build result.
7. Local startup instructions.
8. Demo credentials for development only.
9. Remaining limitations, if any.
10. A clear distinction between implemented functionality and features requiring external integrations or production approvals.

**Final acceptance rule: Do not claim that the project is fully completed unless every mandatory acceptance criterion above has been implemented and verified.**

The objective is a coherent, working healthcare marketplace with dependable booking logic and a safe urgent-assistance workflow, not a collection of disconnected screens.