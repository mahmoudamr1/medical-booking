import type { AvailableDoctorsFilters, DoctorUrgentTab } from '../types';

/** The single query-key set of the urgent feature (every role). */
export const URGENT_KEYS = {
  settings: ['public', 'settings'] as const,
  available: (filters: AvailableDoctorsFilters = {}) => ['urgent', 'available', filters] as const,
  request: (id: string) => ['urgent', 'request', id] as const,
  messages: (id: string) => ['urgent', 'messages', id] as const,
  patientAll: ['urgent', 'patient'] as const,
  patientList: (page: number) => ['urgent', 'patient', page] as const,
  doctorAll: ['urgent', 'doctor'] as const,
  doctorList: (tab: DoctorUrgentTab, page = 1) =>
    page === 1 ? (['urgent', 'doctor', tab] as const) : (['urgent', 'doctor', tab, page] as const),
  volunteer: ['doctor', 'volunteer'] as const,
  adminLive: ['admin', 'urgent', 'live'] as const,
  clinicAvailability: (clinicId: string) => ['clinic', clinicId, 'urgent-availability'] as const,
};
