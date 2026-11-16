/** Bookable availability (backend AvailabilityService output). */
export interface AvailabilitySlot {
  starts_at: string;
  ends_at: string;
}

export interface AvailabilityDay {
  date: string;
  slots: AvailabilitySlot[];
}

export interface Availability {
  doctor_id: string;
  service_id: string;
  timezone: string;
  date_from: string;
  date_to: string;
  days: AvailabilityDay[];
}
