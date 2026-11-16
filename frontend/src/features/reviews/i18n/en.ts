import type { Widen } from '@/i18n/types';
import type { reviewsAr } from './ar';

export const reviewsEn: Widen<typeof reviewsAr> = {
  reviews: {
    starsLabel: '{value} out of 5 stars',
    anonymous: 'Patient',
    report: 'Report review',
    reported: 'Report sent for review',
    reportTitle: 'Report this review?',
    reportBody: 'Our admins will review it. Please tell us why.',
    reasonMin: 'Write a reason of at least 5 characters',
    thanks: 'Thanks for your review',
    rateVisit: 'Rate visit',
    rateTitle: 'Rate your visit',
    rateBody:
      'Tell us about your visit with {doctor}. Your review is shown without your full details.',
    yourRating: 'Your rating',
    comment: 'Comment',
    submit: 'Submit review',
  },
};
