import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BookingPanel } from '@/features/booking';
import { addDaysToKey, todayKey } from '@/lib/dates';
import type { DoctorPublic } from '@/types/api';
import { jsonResponse, mockFetch, ok, renderWithProviders } from '../helpers';
import { routerMock } from '../setup';

const TZ = 'Africa/Cairo';
const tomorrow = addDaysToKey(todayKey(TZ), 1);
const SLOT_A = `${tomorrow}T08:00:00+00:00`;
const SLOT_B = `${tomorrow}T08:30:00+00:00`;

const doctor: DoctorPublic = {
  id: 'doc-1',
  name: 'Dr. Karim',
  title_ar: null,
  title_en: 'Cardiologist',
  gender: null,
  avatar_url: null,
  years_experience: 10,
  rating_avg: 0,
  rating_count: 0,
  min_price: 350,
  currency: 'EGP',
  next_available_at: null,
  accepts_bookings: true,
  verified: true,
  primary_branch: null,
  bio_ar: null,
  bio_en: null,
  qualifications: null,
  booking_mode: 'instant',
  min_cancellation_hours: 24,
  timezone: TZ,
  services: [
    {
      id: 'svc-1',
      doctor_id: 'doc-1',
      name_ar: 'كشف',
      name_en: 'Clinic visit',
      consultation_type: 'in_person',
      duration_minutes: 30,
      price: 350,
      currency: 'EGP',
      is_active: true,
      branch: null,
    },
  ],
};

const me = {
  id: 'u1',
  name: 'Patient',
  email: 'p@x.test',
  phone: null,
  locale: 'en',
  email_verified: true,
  roles: ['patient'],
  permissions: [],
  patient_profile_id: 'pp1',
  doctor_profile: null,
  clinics: [],
};

function availability(slots: string[]) {
  return ok({
    doctor_id: 'doc-1',
    service_id: 'svc-1',
    timezone: TZ,
    date_from: todayKey(TZ),
    date_to: addDaysToKey(todayKey(TZ), 13),
    days: [
      {
        date: tomorrow,
        slots: slots.map((s) => ({
          starts_at: s,
          ends_at: s.replace(
            /T08:(\d\d)/,
            (_, m) => `T08:${String(Number(m) + 30).padStart(2, '0')}`,
          ),
        })),
      },
    ],
  });
}

function setup({
  bookResponse,
  authenticated = true,
}: { bookResponse?: () => Response; authenticated?: boolean } = {}) {
  let availabilityCalls = 0;
  const fetchMock = mockFetch({
    'GET /api/v1/auth/me': () =>
      authenticated
        ? jsonResponse(200, ok(me))
        : jsonResponse(401, { success: false, message: 'Unauthenticated' }),
    'GET /api/v1/doctors/doc-1/availability': () => {
      availabilityCalls += 1;
      // After a conflict the taken slot disappears from the refreshed snapshot.
      return jsonResponse(
        200,
        availabilityCalls === 1 ? availability([SLOT_A, SLOT_B]) : availability([SLOT_B]),
      );
    },
    'GET /sanctum/csrf-cookie': () => {
      document.cookie = 'XSRF-TOKEN=tok; path=/';
      return new Response(null, { status: 204 });
    },
    'POST /api/v1/appointments': bookResponse ?? (() => jsonResponse(500, {})),
  });
  renderWithProviders(<BookingPanel doctor={doctor} />);
  return { fetchMock, availabilityCalls: () => availabilityCalls };
}

async function pickFirstSlotAndContinue() {
  const user = userEvent.setup();
  const slots = await screen.findAllByRole('button', { pressed: false });
  expect(slots).toHaveLength(2);
  expect(slots[0]).toHaveTextContent('10:00 AM'); // 08:00Z shown in Cairo time
  await user.click(slots[0]);
  expect(slots[0]).toHaveAttribute('aria-pressed', 'true');
  await waitFor(() => expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled());
  await user.click(screen.getByRole('button', { name: 'Continue' }));
  return user;
}

describe('BookingPanel', () => {
  it('requests availability for the next 14 days of the selected service', async () => {
    const { fetchMock } = setup();
    await screen.findAllByRole('button', { pressed: false });
    const call = fetchMock.mock.calls.find((c) => String(c[0]).includes('/availability'))!;
    const qs = new URLSearchParams(String(call[0]).split('?')[1]);
    expect(qs.get('service_id')).toBe('svc-1');
    expect(qs.get('date_from')).toBe(todayKey(TZ));
    expect(qs.get('date_to')).toBe(addDaysToKey(todayKey(TZ), 13));
  });

  it('books the selected slot with notes and shows the confirmation screen', async () => {
    const { fetchMock } = setup({
      bookResponse: () =>
        jsonResponse(
          201,
          ok(
            {
              id: 'apt-1',
              reference: 'BK-ABC123',
              status: 'confirmed',
              starts_at: SLOT_A,
              ends_at: SLOT_B,
              timezone: TZ,
            },
            { message: 'Booked' },
          ),
        ),
    });

    const user = await pickFirstSlotAndContinue();
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText('Dr. Karim')).toBeInTheDocument();
    expect(within(dialog).getByText('EGP 350')).toBeInTheDocument();
    await user.type(within(dialog).getByLabelText('Notes for the doctor (optional)'), 'Chest pain');
    await user.click(within(dialog).getByRole('button', { name: 'Confirm booking' }));

    expect(await screen.findByText('Your booking is confirmed')).toBeInTheDocument();
    expect(screen.getByText('BK-ABC123')).toBeInTheDocument();

    const post = fetchMock.mock.calls.find((c) => c[0] === '/api/v1/appointments')!;
    expect(JSON.parse(post[1]!.body as string)).toEqual({
      doctor_id: 'doc-1',
      service_id: 'svc-1',
      starts_at: SLOT_A,
      notes: 'Chest pain',
    });
    expect((post[1]!.headers as Record<string, string>)['X-XSRF-TOKEN']).toBe('tok');
  });

  it('shows a pending state when the doctor confirms manually', async () => {
    setup({
      bookResponse: () =>
        jsonResponse(
          201,
          ok({
            id: 'apt-2',
            reference: 'BK-PEND',
            status: 'pending_confirmation',
            starts_at: SLOT_A,
            ends_at: SLOT_B,
            timezone: TZ,
          }),
        ),
    });
    const user = await pickFirstSlotAndContinue();
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', {
        name: 'Confirm booking',
      }),
    );
    expect(await screen.findByText('Booking request sent')).toBeInTheDocument();
  });

  it('on 409 booking_conflict shows a message and refreshes the slots', async () => {
    const { availabilityCalls } = setup({
      bookResponse: () =>
        jsonResponse(409, { success: false, message: 'Taken', code: 'booking_conflict' }),
    });
    const user = await pickFirstSlotAndContinue();
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', {
        name: 'Confirm booking',
      }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('no longer available');
    await waitFor(() => expect(availabilityCalls()).toBe(2));
    await waitFor(() => expect(screen.getAllByRole('button', { pressed: false })).toHaveLength(1));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });

  it('sends guests to login with a return URL instead of booking', async () => {
    setup({ authenticated: false });
    const user = userEvent.setup();
    const slots = await screen.findAllByRole('button', { pressed: false });
    await user.click(slots[0]);
    await user.click(
      await screen.findByRole('button', { name: 'Sign in to complete your booking' }),
    );
    expect(routerMock.push).toHaveBeenCalledWith(
      `/auth/login?next=${encodeURIComponent('/doctor/doc-1#booking')}`,
    );
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});
