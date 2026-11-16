'use client';

import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query';
import { NAV_BADGE_STALE_MS } from '@/components/layout/dashboard/nav-types';
import { URGENT_KEYS, urgentApi } from '@/features/urgent';
import type { AppointmentStatus } from '@/types/api';
import { clinicApi } from '../api';
import { clinicToday, dayRangeToInstants, type DayRange } from '../dates';
import type { ClinicAffiliation, ClinicAppointmentFilters } from '../types';
import { clinicKeys } from './keys';

const APPOINTMENTS_PAGE_SIZE = 20;
const TODAY_LIMIT = 8;
const URGENT_REFRESH_MS = 60_000;

// ---- Organization -----------------------------------------------------------------

export function useClinicInvitations(enabled: boolean) {
  return useQuery({
    queryKey: clinicKeys.invitations,
    queryFn: clinicApi.invitations,
    enabled,
  });
}

export function useClinicManage(clinicId: string) {
  return useQuery({
    queryKey: clinicKeys.manage(clinicId),
    queryFn: () => clinicApi.manage(clinicId),
  });
}

export function useClinicBranches(clinicId: string) {
  return useQuery({
    queryKey: clinicKeys.branches(clinicId),
    queryFn: () => clinicApi.branches(clinicId),
  });
}

export function useClinicStaff(clinicId: string) {
  return useQuery({
    queryKey: clinicKeys.staff(clinicId),
    queryFn: () => clinicApi.staff(clinicId),
  });
}

// ---- Doctors, services, schedules -------------------------------------------------

export type ClinicDoctor = ClinicAffiliation['doctor'];

/** One entry per doctor (a doctor may be affiliated with several branches). */
export function uniqueDoctors(affiliations: ClinicAffiliation[], activeOnly: boolean) {
  const seen = new Map<string, ClinicDoctor>();
  for (const a of affiliations) {
    if (activeOnly && a.status !== 'active') continue;
    if (!seen.has(a.doctor.id)) seen.set(a.doctor.id, a.doctor);
  }
  return [...seen.values()];
}

const activeDoctors = (affiliations: ClinicAffiliation[]) => uniqueDoctors(affiliations, true);
const allDoctors = (affiliations: ClinicAffiliation[]) => uniqueDoctors(affiliations, false);

const affiliationsQuery = (clinicId: string) =>
  queryOptions({
    queryKey: clinicKeys.doctors(clinicId),
    queryFn: () => clinicApi.doctors(clinicId),
  });

export function useClinicAffiliations(clinicId: string) {
  return useQuery(affiliationsQuery(clinicId));
}

/** The clinic's doctors, derived from the affiliations cache (bookable ones only by default). */
export function useClinicDoctors(
  clinicId: string,
  { includeEnded = false, enabled = true }: { includeEnded?: boolean; enabled?: boolean } = {},
) {
  return useQuery({
    ...affiliationsQuery(clinicId),
    select: includeEnded ? allDoctors : activeDoctors,
    enabled,
  });
}

/** Bookable (active) services of the clinic's doctors. */
export function useClinicServices(clinicId: string) {
  return useQuery({
    queryKey: clinicKeys.activeServices(clinicId),
    queryFn: () => clinicApi.services(clinicId, true),
  });
}

/** Weekly schedule windows; an empty `doctorId` means every doctor. */
export function useClinicSchedules(clinicId: string, doctorId: string) {
  return useQuery({
    queryKey: clinicKeys.doctorSchedules(clinicId, doctorId),
    queryFn: () => clinicApi.schedules(clinicId, doctorId || undefined),
  });
}

export function useClinicUrgentAvailability(clinicId: string) {
  return useQuery({
    queryKey: URGENT_KEYS.clinicAvailability(clinicId),
    queryFn: () => urgentApi.clinicAvailability(clinicId),
    refetchInterval: URGENT_REFRESH_MS,
  });
}

// ---- Appointments -----------------------------------------------------------------

/** List filters as the UI holds them: '' means "any"; dates are Cairo calendar days. */
export interface AppointmentFilterValues extends DayRange {
  branch_id: string;
  doctor_id: string;
  status: AppointmentStatus | '';
  q: string;
}

export function toAppointmentQuery(
  values: AppointmentFilterValues,
  page: number,
): ClinicAppointmentFilters {
  return {
    branch_id: values.branch_id || undefined,
    doctor_id: values.doctor_id || undefined,
    status: values.status || undefined,
    ...dayRangeToInstants(values),
    q: values.q.trim() || undefined,
    page,
    per_page: APPOINTMENTS_PAGE_SIZE,
  };
}

export function useClinicAppointments(
  clinicId: string,
  values: AppointmentFilterValues,
  page: number,
) {
  const filters = toAppointmentQuery(values, page);
  return useQuery({
    queryKey: clinicKeys.appointmentList(clinicId, filters),
    queryFn: () => clinicApi.appointments(clinicId, filters),
    placeholderData: keepPreviousData,
  });
}

export function useTodayAppointments(clinicId: string) {
  const today = clinicToday();
  return useQuery({
    queryKey: clinicKeys.todayAppointments(clinicId, today),
    queryFn: () =>
      clinicApi.appointments(clinicId, {
        ...dayRangeToInstants({ from: today, to: today }),
        per_page: TODAY_LIMIT,
      }),
  });
}

/** Upcoming appointments awaiting confirmation (sidebar badge): a 1-row page, only its total is used. */
export function usePendingAppointmentsCount(clinicId: string, enabled: boolean) {
  return useQuery({
    queryKey: clinicKeys.pendingCount(clinicId),
    queryFn: () =>
      clinicApi.appointments(clinicId, {
        status: 'pending_confirmation',
        from: new Date().toISOString(),
        per_page: 1,
      }),
    select: (page) => page.pagination.total,
    enabled,
    staleTime: NAV_BADGE_STALE_MS,
  });
}

/** Full appointment (incl. status history) from the clinic endpoint. */
export function useClinicAppointment(clinicId: string, appointmentId: string) {
  return useQuery({
    queryKey: clinicKeys.appointment(clinicId, appointmentId),
    queryFn: () => clinicApi.appointment(clinicId, appointmentId),
  });
}

// ---- Reports ----------------------------------------------------------------------

export function useClinicReport(clinicId: string, days: DayRange) {
  const range = dayRangeToInstants(days);
  return useQuery({
    queryKey: clinicKeys.report(clinicId, range),
    queryFn: () => clinicApi.reports(clinicId, range),
    placeholderData: keepPreviousData,
  });
}
