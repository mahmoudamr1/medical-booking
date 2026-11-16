import type { ClinicSection } from './permissions';

const ROOT = '/dashboard/clinic';

/** Entry route: redirects members to their first clinic, lets everyone else create one. */
export const CLINIC_HOME = ROOT;

/** Dashboard URL of a clinic section: /dashboard/clinic/{clinicId}[/{section}]. */
export function clinicPath(clinicId: string, section: ClinicSection = 'overview'): string {
  return section === 'overview' ? `${ROOT}/${clinicId}` : `${ROOT}/${clinicId}/${section}`;
}

/**
 * The same section in another clinic. Detail sub-routes and filters don't exist across clinics,
 * so only the first segment after the clinic id is kept.
 */
export function switchClinicPath(pathname: string, fromClinicId: string, toClinicId: string) {
  const prefix = `${ROOT}/${fromClinicId}`;
  const rest = pathname.startsWith(prefix) ? pathname.slice(prefix.length) : '';
  const section = rest.split('/').filter(Boolean)[0];
  return section ? `${ROOT}/${toClinicId}/${section}` : `${ROOT}/${toClinicId}`;
}
