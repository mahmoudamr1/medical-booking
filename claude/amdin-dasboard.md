Implement the following requirements in the existing Medical Booking project. Do not rewrite the project architecture or repeat existing features.

## 1. Admin Dashboard
- Ensure a fully functional Admin Dashboard exists.
- Implement user management, doctor verification, clinic management, appointment management, urgent requests management, and platform statistics.
- All dashboard data must come from the real backend APIs and database.
- Enforce role-based permissions on the backend.

## 2. Create Demo Test Accounts

Create permanent, reusable development test accounts for all major roles:

1. Admin.
2. Patient / Customer.
3. Verified Doctor.
4. Volunteer Doctor.
5. Pending / Unverified Doctor.
6. Clinic Owner.
7. Receptionist / Clinic Staff.

For every account:
- Create a real database record.
- Assign the correct roles and permissions.
- Create all required profile relationships.
- Add realistic synthetic demo data.
- Ensure the account can successfully log in.
- Ensure it opens the correct dashboard.

Use predictable development-only email addresses and generate passwords. Never enable demo accounts in production.

## 3. Test Data

Populate the demo environment with enough realistic data to test every dashboard:

- Patients.
- Doctors and specialties.
- Clinics and branches.
- Appointments with different statuses.
- Doctor schedules and available slots.
- Reviews and ratings.
- Volunteer doctors and availability.
- Urgent requests.
- Pending doctor verification applications.

Ensure database relationships and appointment constraints remain valid.

## 4. Dashboard Verification

Log in using every demo account and verify:

- Authentication works.
- The correct dashboard opens.
- Dashboard sections render.
- Real API data loads.
- Available actions work.
- Unauthorized pages are blocked.
- Role permissions are respected.

Use automated tests and browser testing where available.

Do not claim successful verification without actually executing it.

## 5. Seeder and Commands

Implement an idempotent demo seeder and the command:

`php artisan demo:seed`

It must safely create or update all demo accounts and their associated data without duplicating records.

Add a production environment guard to prevent accidental creation of demo accounts in production.

## 6. Mandatory Documentation

Create:

`docs/DEMO-ACCOUNTS.md`

Document:
- Every demo account.
- Actual login email.
- Actual development password.
- Role and permissions.
- Dashboard URL.
- Account status.
- Available test data.
- How to generate demo accounts.
- How to reset the local demo environment.

Update the root `README.md` with:
- A Demo Accounts section.
- All actual login emails and passwords.
- Direct dashboard URLs.
- Demo seeder command.
- Link to `docs/DEMO-ACCOUNTS.md`.

Also create:

`docs/DEMO-DELIVERY-REPORT.md`

Include:
- Implemented dashboards.
- Created demo accounts.
- Actual authentication test results.
- Dashboard verification results.
- Backend and frontend test results.
- Any remaining issues.

## 7. Final Acceptance

Do not consider this task complete until:

- All seven demo accounts exist.
- Every account can log in.
- Every account opens its correct dashboard.
- Admin dashboard works.
- Role permissions are verified.
- Demo data is connected to the real database.
- Seeders are repeatable.
- Documentation is complete and accurate.
- README links to the documentation.
- Test results are recorded.

Finally, return a concise report containing all login credentials, passwords, dashboard URLs, executed test results, and documentation paths.

Do not invent credentials, URLs, or test results. Read them from the actual implemented project.

Implement and verify everything directly in the existing repository. Do not stop after creating files or scaffolding.