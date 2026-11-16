/** Patient account query keys (under ['patient', …], dropped on logout). */
export const patientKeys = {
  profile: ['patient', 'profile'] as const,
  consents: ['patient', 'consents'] as const,
};
