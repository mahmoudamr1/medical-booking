// Demo accounts for E2E tests — mirrors backend/config/demo.php (development only).
// Single source for tests: import from here instead of hard-coding credentials.
export const SUPPORT_PASSWORD = process.env.DEMO_PASSWORD_SUPPORT ?? 'Demo-RiHnPunOQz!';

export const accounts = {
  admin: {
    email: 'admin@example.test',
    password: process.env.DEMO_PASSWORD_ADMIN ?? 'Demo-GGH0Z6zRKs!',
    dashboard: '/dashboard/admin',
  },
  patient: {
    email: 'patient@example.test',
    password: process.env.DEMO_PASSWORD_PATIENT ?? 'Demo-AxXlsaoJM4!',
    dashboard: '/dashboard/patient',
  },
  doctor: {
    email: 'dr.karim@example.test',
    password: process.env.DEMO_PASSWORD_DOCTOR ?? 'Demo-PUoLRPjAHp!',
    dashboard: '/dashboard/doctor',
  },
  volunteer: {
    email: 'dr.volunteer@example.test',
    password: process.env.DEMO_PASSWORD_VOLUNTEER ?? 'Demo-hlUMkMhiOf!',
    dashboard: '/dashboard/doctor/urgent',
  },
  pending: {
    email: 'dr.pending@example.test',
    password: process.env.DEMO_PASSWORD_PENDING ?? 'Demo-7ANWis8nIA!',
    dashboard: '/dashboard/doctor/verification',
  },
  owner: {
    email: 'clinic.owner@example.test',
    password: process.env.DEMO_PASSWORD_OWNER ?? 'Demo-hYkWzO43sg!',
    dashboard: '/dashboard/clinic',
  },
  reception: {
    email: 'reception@example.test',
    password: process.env.DEMO_PASSWORD_RECEPTION ?? 'Demo-Ws6Yu7zXIW!',
    dashboard: '/dashboard/clinic',
  },
  // Supporting accounts (shared password)
  patient2: {
    email: 'patient2@example.test',
    password: SUPPORT_PASSWORD,
    dashboard: '/dashboard/patient',
  },
  manualDoctor: {
    email: 'dr.omar@example.test',
    password: SUPPORT_PASSWORD,
    dashboard: '/dashboard/doctor',
  },
  clinic2Owner: {
    email: 'clinic2.owner@example.test',
    password: SUPPORT_PASSWORD,
    dashboard: '/dashboard/clinic',
  },
} as const;

export type AccountKey = keyof typeof accounts;
