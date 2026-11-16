'use client';

import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { bookingKeys } from '@/features/booking';
import { isApiError } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthProvider';
import type { AppointmentAction } from '@/types/api';
import { clinicApi } from '../api';
import type {
  AffiliateDoctorPayload,
  BookOnBehalfPayload,
  BranchHoursPayload,
  BranchPayload,
  ClinicCreatePayload,
  ClinicDetailsPayload,
  InvitationDecision,
  InviteStaffPayload,
  StaffUpdatePayload,
} from '../types';
import { clinicKeys } from './keys';

/** A mutation that refreshes the given query prefixes once it succeeds (callers add toasts/navigation). */
function useInvalidatingMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  invalidates: (variables: TVariables) => QueryKey[],
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (_data, variables) => {
      for (const queryKey of invalidates(variables)) queryClient.invalidateQueries({ queryKey });
    },
  });
}

// ---- Organization -----------------------------------------------------------------

/** Clinic names shown in the switcher come from /auth/me, so the session is refreshed too. */
export function useCreateClinic() {
  const { refresh } = useAuth();
  return useMutation({
    mutationFn: (body: ClinicCreatePayload) => clinicApi.create(body),
    onSuccess: () => refresh(),
  });
}

export function useUpdateClinicDetails(clinicId: string) {
  const queryClient = useQueryClient();
  const { refresh } = useAuth();
  return useMutation({
    mutationFn: (body: ClinicDetailsPayload) => clinicApi.updateManage(clinicId, body),
    onSuccess: ({ data }) => {
      queryClient.setQueryData(clinicKeys.manage(clinicId), data);
      return refresh();
    },
  });
}

export function useRespondInvitation() {
  const queryClient = useQueryClient();
  const { refresh } = useAuth();
  return useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: InvitationDecision }) =>
      clinicApi.respondInvitation(id, decision),
    onSuccess: (_data, { decision }) => {
      queryClient.invalidateQueries({ queryKey: clinicKeys.invitations });
      // An accepted clinic shows up in /auth/me → user.clinics (dashboard links, switcher).
      return decision === 'accept' ? refresh() : undefined;
    },
  });
}

// ---- Branches ---------------------------------------------------------------------

/** Creates the branch, or updates it when `id` is given. */
export function useSaveBranch(clinicId: string) {
  return useInvalidatingMutation(
    ({ id, body }: { id?: string; body: BranchPayload }) =>
      id ? clinicApi.updateBranch(clinicId, id, body) : clinicApi.createBranch(clinicId, body),
    () => [clinicKeys.branches(clinicId)],
  );
}

export function useDeleteBranch(clinicId: string) {
  return useInvalidatingMutation(
    (id: string) => clinicApi.deleteBranch(clinicId, id),
    () => [clinicKeys.branches(clinicId)],
  );
}

export function useSaveBranchHours(clinicId: string, branchId: string) {
  return useInvalidatingMutation(
    (hours: BranchHoursPayload) => clinicApi.saveHours(clinicId, branchId, hours),
    () => [clinicKeys.branches(clinicId)],
  );
}

// ---- Staff ------------------------------------------------------------------------

export function useInviteStaff(clinicId: string) {
  return useInvalidatingMutation(
    (body: InviteStaffPayload) => clinicApi.invite(clinicId, body),
    () => [clinicKeys.staff(clinicId)],
  );
}

export function useUpdateStaff(clinicId: string) {
  return useInvalidatingMutation(
    ({ id, body }: { id: string; body: StaffUpdatePayload }) =>
      clinicApi.updateStaff(clinicId, id, body),
    () => [clinicKeys.staff(clinicId)],
  );
}

export function useRemoveStaff(clinicId: string) {
  return useInvalidatingMutation(
    (id: string) => clinicApi.removeStaff(clinicId, id),
    () => [clinicKeys.staff(clinicId)],
  );
}

// ---- Doctors ----------------------------------------------------------------------

/** Linking or unlinking a doctor also changes the clinic's bookable services and schedules. */
const affiliationKeys = (clinicId: string) => [
  clinicKeys.doctors(clinicId),
  clinicKeys.services(clinicId),
  clinicKeys.schedules(clinicId),
];

export function useAffiliateDoctor(clinicId: string) {
  return useInvalidatingMutation(
    (body: AffiliateDoctorPayload) => clinicApi.affiliate(clinicId, body),
    () => affiliationKeys(clinicId),
  );
}

export function useEndAffiliation(clinicId: string) {
  return useInvalidatingMutation(
    (id: string) => clinicApi.endAffiliation(clinicId, id),
    () => affiliationKeys(clinicId),
  );
}

// ---- Appointments -----------------------------------------------------------------

/** True for the API's booking_conflict answer: the slot was taken while the form was open. */
export function isSlotConflict(error: unknown): boolean {
  return isApiError(error) && error.status === 409;
}

export function useBookOnBehalf(clinicId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: BookOnBehalfPayload) => clinicApi.book(clinicId, body),
    onSuccess: (_data, { doctor_id }) => {
      queryClient.invalidateQueries({ queryKey: clinicKeys.appointments(clinicId) });
      queryClient.invalidateQueries({ queryKey: clinicKeys.reports(clinicId) });
      queryClient.invalidateQueries({ queryKey: bookingKeys.doctor(doctor_id) });
    },
    onError: (error, { doctor_id, service_id }) => {
      if (!isSlotConflict(error)) return;
      queryClient.invalidateQueries({ queryKey: bookingKeys.availability(doctor_id, service_id) });
    },
  });
}

export function useAppointmentTransition(clinicId: string, appointmentId: string) {
  return useInvalidatingMutation(
    ({ action, reason }: { action: AppointmentAction; reason?: string }) =>
      clinicApi.transition(clinicId, appointmentId, action, reason),
    () => [
      clinicKeys.appointments(clinicId),
      clinicKeys.appointment(clinicId, appointmentId),
      clinicKeys.reports(clinicId),
    ],
  );
}
