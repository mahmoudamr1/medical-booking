/**
 * Clinic roles, permissions and section access — the one place the dashboard asks "may this member…?".
 * UX only: it hides or disables what a role lacks; the API authorizes every call.
 */
import type { TranslationKey } from '@/i18n/translate';
import {
  CLINIC_PERMISSIONS as P,
  type ClinicMembership,
  type ClinicPermission,
  type ClinicRole,
  type StaffRole,
} from './types';

const ROLE_LABELS: Record<ClinicRole, TranslationKey> = {
  owner: 'clinic.roles.owner',
  manager: 'clinic.roles.manager',
  receptionist: 'clinic.roles.receptionist',
};

/** Roles staff management may assign (backend ClinicRole::assignableValues — never the owner). */
export const ASSIGNABLE_ROLES: readonly StaffRole[] = ['manager', 'receptionist'];

function isClinicRole(role: string): role is ClinicRole {
  return role in ROLE_LABELS;
}

/** Label key of a clinic role; an unknown role reads as the least-privileged one. */
export function roleKey(role: string): TranslationKey {
  return ROLE_LABELS[isClinicRole(role) ? role : 'receptionist'];
}

/** The owner's membership is fixed: its role and status cannot be changed and it cannot be removed. */
export function isOwner(role: string): boolean {
  return role === 'owner';
}

type Grants = Pick<ClinicMembership, 'permissions'> | null | undefined;

export function hasPermission(membership: Grants, permission: ClinicPermission): boolean {
  return !!membership?.permissions.includes(permission);
}

/** Dashboard sections; the value is also the route segment (`overview` is the clinic root). */
export const CLINIC_SECTIONS = [
  'overview',
  'appointments',
  'schedules',
  'doctors',
  'staff',
  'branches',
  'settings',
] as const;

export type ClinicSection = (typeof CLINIC_SECTIONS)[number];

/** Permission needed to open a section (nav items and screen guards share it); absent = any member. */
const SECTION_PERMISSION: Partial<Record<ClinicSection, ClinicPermission>> = {
  appointments: P.viewAppointments,
  schedules: P.viewSchedules,
  doctors: P.viewSchedules,
  staff: P.manageStaff,
};

export function canOpenSection(membership: Grants, section: ClinicSection): boolean {
  const required = SECTION_PERMISSION[section];
  return !!membership && (!required || hasPermission(membership, required));
}
