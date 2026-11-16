/** Public review list keys. */
export const reviewKeys = {
  doctor: (doctorId: string) => ['public', 'reviews', doctorId] as const,
  page: (doctorId: string, page: number) => ['public', 'reviews', doctorId, page] as const,
};
