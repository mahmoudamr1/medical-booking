/** Doctor reviews: public list, rating a visit, reporting. */
import { api } from '@/lib/api/client';
import type { Review } from './types';

export const reviewsApi = {
  forDoctor: (doctorId: string, page = 1) =>
    api.page<Review>(`/doctors/${doctorId}/reviews`, { page, per_page: 5 }),
  create: (appointmentId: string, body: { rating: number; comment?: string }) =>
    api.post<Review>(`/appointments/${appointmentId}/review`, body),
  report: (reviewId: string, reason: string) =>
    api.post<null>(`/reviews/${reviewId}/report`, { reason }),
};
