/** Appointment query keys: single appointments and the patient's own lists (['patient', …]). */
export const appointmentKeys = {
  all: ['appointment'] as const,
  detail: (id: string | null) => ['appointment', id] as const,
  patient: ['patient'] as const,
  patientSummary: ['patient', 'summary'] as const,
  /** Page 1 of a group is shared by the dashboard list and the highlight cards. */
  patientList: (group: string, page: number) => ['patient', 'appointments', group, page] as const,
};
