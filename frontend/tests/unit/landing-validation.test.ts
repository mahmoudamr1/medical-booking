import { describe, expect, it } from 'vitest';
import { landingPathFor, postLoginPath, safeNext } from '@/lib/auth/landing';
import { EGYPT_PHONE } from '@/lib/validation';
import type { CurrentUser } from '@/types/api';

type U = Pick<CurrentUser, 'roles' | 'doctor_profile' | 'clinics'>;
const base: U = { roles: ['patient'], doctor_profile: null, clinics: [] };
const doctor = (
  verification_status: 'draft' | 'pending' | 'approved' | 'rejected' | 'suspended',
  volunteer_active?: boolean,
): U => ({
  roles: ['doctor'],
  doctor_profile: { id: 'd', verification_status, is_active: true, volunteer_active },
  clinics: [],
});
const clinic = [{ id: 'c', slug: 's', name_ar: 'ع', name_en: 'C', role: 'owner', permissions: [] }];

describe('landingPathFor', () => {
  it('sends admins to the admin dashboard first', () => {
    expect(landingPathFor({ ...base, roles: ['admin', 'patient'], clinics: clinic })).toBe(
      '/dashboard/admin',
    );
  });

  it.each(['draft', 'pending', 'rejected', 'suspended'] as const)(
    'sends %s doctors to verification',
    (status) => {
      expect(landingPathFor(doctor(status, true))).toBe('/dashboard/doctor/verification');
    },
  );

  it('sends active volunteers to urgent requests and other approved doctors to their dashboard', () => {
    expect(landingPathFor(doctor('approved', true))).toBe('/dashboard/doctor/urgent');
    expect(landingPathFor(doctor('approved', false))).toBe('/dashboard/doctor');
    expect(landingPathFor(doctor('approved'))).toBe('/dashboard/doctor');
  });

  it('sends clinic members to the clinic dashboard and everyone else to the patient dashboard', () => {
    expect(landingPathFor({ ...base, clinics: clinic })).toBe('/dashboard/clinic');
    expect(landingPathFor(base)).toBe('/dashboard/patient');
  });

  it('honours only safe same-origin next paths', () => {
    expect(postLoginPath(base, '/doctor/1#booking')).toBe('/doctor/1#booking');
    expect(postLoginPath(base, 'https://evil.test')).toBe('/dashboard/patient');
    expect(postLoginPath(base, '//evil.test')).toBe('/dashboard/patient');
    expect(safeNext('/\\evil.test')).toBeNull();
    expect(safeNext(null)).toBeNull();
  });
});

describe('EGYPT_PHONE', () => {
  it.each(['01012345678', '+201012345678', '201012345678', '1012345678', '01512345678'])(
    'accepts %s',
    (v) => {
      expect(EGYPT_PHONE.test(v)).toBe(true);
    },
  );
  it.each(['0123', '01312345678', '0101234567', '+2001012345678x', ''])('rejects %s', (v) => {
    expect(EGYPT_PHONE.test(v)).toBe(false);
  });
});
