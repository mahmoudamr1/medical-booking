import type { QueryValue } from '@/lib/api/client';
import type { Bilingual, ConsultationType, DoctorCard, Specialty } from '@/types/api';

export interface FeaturedClinic extends Bilingual {
  id: string;
  slug: string;
  branches_count: number;
  logo_url?: string | null;
}

export interface PopularService extends Bilingual {
  consultation_type: ConsultationType;
  bookings: number;
  from_price: number;
}

export interface HomeStats {
  doctors: number;
  specialties: number;
  clinics: number;
  completed_visits: number;
}

export interface HomeData {
  specialties: Specialty[];
  recommended_doctors: DoctorCard[];
  available_soon: DoctorCard[];
  featured_clinics: FeaturedClinic[];
  popular_services: PopularService[];
  stats: HomeStats;
  urgent: { enabled: boolean };
}

/** Query of GET /doctors. Values stay strings because they round-trip through the URL. */
export interface DoctorSearchParams extends Record<string, QueryValue> {
  q?: string;
  specialty?: string;
  governorate?: string;
  city?: string;
  area?: string;
  min_price?: string;
  max_price?: string;
  min_rating?: string;
  consultation_type?: string;
  available_on?: string;
  sort?: string;
  page?: string;
  per_page?: string;
}
