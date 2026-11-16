/** Availability query keys (public: anyone can look up open slots). */
export const bookingKeys = {
  doctor: (doctorId: string) => ['public', 'availability', doctorId] as const,
  availability: (doctorId: string, serviceId: string | null) =>
    ['public', 'availability', doctorId, serviceId] as const,
};
