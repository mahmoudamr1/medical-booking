/** Pure helpers that turn a notification into display text and a deep link. */
import type { AppNotification } from './types';

export function notificationText(n: AppNotification): { title: string; body: string } {
  return { title: n.title ?? n.kind ?? '', body: n.body ?? '' };
}

/** Deep link for a notification, when it refers to an appointment or urgent request. */
export function notificationHref(n: AppNotification): string | null {
  const data = n.data ?? {};
  if (typeof data.urgent_request_id === 'string') return `/urgent/${data.urgent_request_id}`;
  if (typeof data.appointment_id === 'string' && (n.kind ?? '').includes('patient'))
    return `/dashboard/patient/appointments/${data.appointment_id}`;
  return null;
}
