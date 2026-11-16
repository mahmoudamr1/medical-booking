import type { CurrentUser } from '@/types/api';

const DOCTOR_NEEDS_VERIFICATION = new Set(['draft', 'pending', 'rejected', 'suspended']);

/**
 * Where a signed-in user lands after sign-in (and when opening /dashboard), by role:
 * 1. admin → /dashboard/admin
 * 2. doctor: not yet verified (draft/pending/rejected/suspended) → verification page;
 *    active volunteer → urgent requests; otherwise → doctor dashboard
 * 3. clinic member → /dashboard/clinic
 * 4. everyone else → /dashboard/patient
 */
export function landingPathFor(
  user: Pick<CurrentUser, 'roles' | 'doctor_profile' | 'clinics'>,
): string {
  if (user.roles.includes('admin')) return '/dashboard/admin';
  const doctor = user.doctor_profile;
  if (doctor) {
    if (DOCTOR_NEEDS_VERIFICATION.has(doctor.verification_status))
      return '/dashboard/doctor/verification';
    if (doctor.volunteer_active === true) return '/dashboard/doctor/urgent';
    return '/dashboard/doctor';
  }
  if (user.clinics.length > 0) return '/dashboard/clinic';
  return '/dashboard/patient';
}

/** Only same-origin relative paths are accepted as return URLs (prevents open redirects). */
export function safeNext(next: string | null | undefined): string | null {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\'))
    return null;
  return next;
}

/** Post-login destination: an explicit safe `next` wins, otherwise the role landing page. */
export function postLoginPath(
  user: Pick<CurrentUser, 'roles' | 'doctor_profile' | 'clinics'>,
  next?: string | null,
): string {
  return safeNext(next) ?? landingPathFor(user);
}
