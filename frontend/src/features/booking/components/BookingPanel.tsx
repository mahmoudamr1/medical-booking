'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Appointment, DoctorPublic, Service } from '@/types/api';
import type { AvailabilitySlot } from '../types';
import { SlotPicker } from './AvailabilityCalendar';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { ServiceOption, StepTitle } from './ServiceOption';
import { BookingSuccess } from './BookingSuccess';
import { DoctorAvatar } from '@/components/shared/MediaFallback';
import { Button } from '@/components/ui/button';
import { bookingApi } from '../api';
import { isApiError } from '@/lib/api/client';
import { errorMessage } from '@/lib/api/errors';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useFormat, useT } from '@/i18n/provider';
import { BUSINESS_TZ } from '@/i18n/format';
import { asArray } from '@/lib/utils';
import { bookingKeys } from '../hooks/keys';
import { appointmentKeys } from '@/features/appointments';

export function BookingPanel({ doctor }: { doctor: DoctorPublic }) {
  const t = useT();
  const f = useFormat();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const services = asArray<Service>(doctor.services);
  const tz = doctor.timezone || BUSINESS_TZ;

  const [serviceId, setServiceId] = useState<string | null>(services[0]?.id ?? null);
  const [slot, setSlot] = useState<AvailabilitySlot | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<string | null>(null);
  const [booked, setBooked] = useState<Appointment | null>(null);

  const service = services.find((s) => s.id === serviceId) ?? null;
  const loginHref = `/auth/login?next=${encodeURIComponent(`${pathname}#booking`)}`;

  const book = useMutation({
    mutationFn: (notes: string) =>
      bookingApi.book({
        doctor_id: doctor.id,
        service_id: serviceId!,
        starts_at: slot!.starts_at,
        notes: notes || undefined,
      }),
    onSuccess: ({ data, message }) => {
      setConfirmOpen(false);
      setBooked(data);
      toast.success(message || t('booking.successConfirmedTitle'));
      queryClient.invalidateQueries({ queryKey: bookingKeys.doctor(doctor.id) });
      queryClient.invalidateQueries({ queryKey: appointmentKeys.patient });
    },
    onError: (error) => {
      if (isApiError(error) && error.status === 401) {
        router.push(loginHref);
        return;
      }
      if (isApiError(error) && error.status === 409) {
        // Slot was taken meanwhile: close, clear the choice and refresh availability.
        setConfirmOpen(false);
        setSlot(null);
        setConflict(t('errors.slotTaken'));
        toast.error(t('errors.slotTaken'));
        queryClient.invalidateQueries({ queryKey: bookingKeys.availability(doctor.id, serviceId) });
        return;
      }
      setDialogError(errorMessage(error, t));
    },
  });

  if (booked) {
    return (
      <BookingSuccess
        appointment={booked}
        tz={booked.timezone ?? tz}
        onBookAnother={() => {
          setBooked(null);
          setSlot(null);
        }}
      />
    );
  }

  if (!doctor.accepts_bookings) return <EmptyState title={t('doctor.notAcceptingBookings')} />;
  if (services.length === 0) return <EmptyState title={t('booking.noServices')} />;

  const onContinue = () => {
    if (!user) {
      router.push(loginHref);
      return;
    }
    setDialogError(null);
    setConfirmOpen(true);
  };

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <StepTitle n={1}>{t('booking.step1')}</StepTitle>
        <div role="radiogroup" aria-label={t('booking.step1')} className="grid gap-2">
          {services.map((s) => (
            <ServiceOption
              key={s.id}
              service={s}
              selected={s.id === serviceId}
              onSelect={() => {
                setServiceId(s.id);
                setSlot(null);
                setConflict(null);
              }}
            />
          ))}
        </div>
      </section>

      {serviceId && (
        <section className="space-y-3">
          <StepTitle n={2}>{t('booking.step2')}</StepTitle>
          {conflict && (
            <p
              role="alert"
              className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
            >
              {conflict}
            </p>
          )}
          <SlotPicker
            doctorId={doctor.id}
            serviceId={serviceId}
            tz={tz}
            selected={slot}
            onSelect={setSlot}
          />
        </section>
      )}

      <div className="space-y-3 border-t pt-4">
        {service && slot && (
          <div className="flex items-center justify-between gap-3 rounded-lg bg-accent px-3 py-2 text-sm text-accent-foreground">
            <span>{f.dateTime(slot.starts_at, tz)}</span>
            <span className="font-semibold">{f.money(service.price)}</span>
          </div>
        )}
        <Button onClick={onContinue} disabled={!slot || !service} className="w-full" size="lg">
          {user ? t('booking.continue') : t('booking.loginToBook')}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          {doctor.booking_mode === 'manual'
            ? t('doctor.bookingManual')
            : t('doctor.bookingInstant')}
        </p>
      </div>

      {service && slot && (
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title={t('booking.confirmTitle')}
          description={t('booking.confirmDescription')}
          confirmLabel={book.isPending ? t('booking.booking') : t('booking.confirmButton')}
          pending={book.isPending}
          error={dialogError}
          reason={{ label: t('booking.notesLabel'), placeholder: t('booking.notesPlaceholder') }}
          onConfirm={(notes) => {
            setDialogError(null);
            book.mutate(notes);
          }}
        >
          <div className="flex items-center gap-3">
            <DoctorAvatar name={doctor.name} url={doctor.avatar_url} className="size-12 text-sm" />
            <div>
              <p className="font-semibold">{doctor.name}</p>
              {f.l(doctor, 'title') && (
                <p className="text-sm text-muted-foreground">{f.l(doctor, 'title')}</p>
              )}
            </div>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-lg border bg-muted/40 p-4 text-sm">
            <dt className="text-muted-foreground">{t('booking.service')}</dt>
            <dd className="font-medium">{f.l(service)}</dd>
            <dt className="text-muted-foreground">{t('booking.location')}</dt>
            <dd className="font-medium">
              {service.branch
                ? f.l(service.branch)
                : t(`consultation.${service.consultation_type}`)}
            </dd>
            <dt className="text-muted-foreground">{t('booking.date')}</dt>
            <dd className="font-medium">{f.date(slot.starts_at, tz)}</dd>
            <dt className="text-muted-foreground">{t('booking.time')}</dt>
            <dd className="font-medium tabular-nums">
              {f.time(slot.starts_at, tz)} – {f.time(slot.ends_at, tz)}
            </dd>
            <dt className="text-muted-foreground">{t('booking.price')}</dt>
            <dd className="font-semibold">{f.money(service.price)}</dd>
          </dl>
        </ConfirmDialog>
      )}
    </div>
  );
}
