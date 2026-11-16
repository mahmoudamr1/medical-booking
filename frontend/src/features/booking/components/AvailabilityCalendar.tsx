'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarX2 } from 'lucide-react';
import type { AvailabilityDay, AvailabilitySlot } from '../types';
import { SlotButton } from './SlotButton';
import { bookingApi } from '../api';
import { addDaysToKey, rangeKeys, todayKey } from '@/lib/dates';
import { useFormat, useT } from '@/i18n/provider';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState, Skeleton } from '@/components/shared/states';
import { cn } from '@/lib/utils';
import { bookingKeys } from '../hooks/keys';

export const BOOKING_WINDOW_DAYS = 14;

/** Presentational day strip + slot grid for API availability (instants are UTC; shown in `tz`). */
export function AvailabilityCalendar({
  days,
  dateKeys,
  tz,
  activeDate,
  onSelectDate,
  selected,
  onSelectSlot,
}: {
  days: AvailabilityDay[];
  dateKeys: string[];
  tz: string;
  activeDate: string | null;
  onSelectDate: (date: string) => void;
  selected: AvailabilitySlot | null;
  onSelectSlot: (slot: AvailabilitySlot) => void;
}) {
  const t = useT();
  const f = useFormat();
  const byDate = new Map(days.map((d) => [d.date, d.slots]));
  const slots = activeDate ? (byDate.get(activeDate) ?? []) : [];

  return (
    <div className="space-y-4">
      <div
        role="listbox"
        aria-label={t('booking.step2')}
        className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2"
      >
        {dateKeys.map((key) => {
          const count = byDate.get(key)?.length ?? 0;
          const isActive = key === activeDate;
          return (
            <button
              key={key}
              type="button"
              role="option"
              data-date={key}
              aria-selected={isActive}
              disabled={count === 0}
              onClick={() => onSelectDate(key)}
              className={cn(
                'flex w-[4.5rem] shrink-0 flex-col items-center gap-0.5 rounded-lg border px-1 py-2 text-xs transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
                isActive
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card hover:border-primary/50',
                count === 0 && 'cursor-not-allowed opacity-40',
              )}
            >
              <span className={isActive ? '' : 'text-muted-foreground'}>
                {f.dateKey(key, { weekday: 'short' })}
              </span>
              <span className="text-lg leading-tight font-semibold">
                {f.dateKey(key, { day: 'numeric' })}
              </span>
              <span className={isActive ? '' : 'text-muted-foreground'}>
                {f.dateKey(key, { month: 'short' })}
              </span>
              <span
                className={cn(
                  'mt-1 rounded-full px-1.5 text-[10px]',
                  isActive ? 'bg-white/20' : count ? 'bg-emerald-50 text-emerald-700' : '',
                )}
              >
                {t('booking.slotsCount', { count: f.number(count) })}
              </span>
            </button>
          );
        })}
      </div>

      {activeDate && (
        <div className="space-y-3">
          <p className="text-sm font-medium">{f.dateKey(activeDate)}</p>
          {slots.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {t('booking.noSlotsDay')}
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {slots.map((slot) => (
                <SlotButton
                  key={slot.starts_at}
                  startsAt={slot.starts_at}
                  label={f.time(slot.starts_at, tz)}
                  selected={selected?.starts_at === slot.starts_at}
                  onClick={() => onSelectSlot(slot)}
                />
              ))}
            </div>
          )}
        </div>
      )}
      <p className="text-xs text-muted-foreground">{t('booking.timezoneNote', { tz })}</p>
    </div>
  );
}

/** Fetches the next 14 days of availability for a service and renders the picker with all states. */
export function SlotPicker({
  doctorId,
  serviceId,
  tz,
  selected,
  onSelect,
}: {
  doctorId: string;
  serviceId: string;
  tz: string;
  selected: AvailabilitySlot | null;
  onSelect: (slot: AvailabilitySlot | null) => void;
}) {
  const t = useT();
  const [pickedDate, setPickedDate] = useState<string | null>(null);
  const from = todayKey(tz);
  const to = addDaysToKey(from, BOOKING_WINDOW_DAYS - 1);
  const dateKeys = rangeKeys(from, BOOKING_WINDOW_DAYS);

  const query = useQuery({
    queryKey: [...bookingKeys.availability(doctorId, serviceId), from],
    queryFn: () =>
      bookingApi.availability(doctorId, { service_id: serviceId, date_from: from, date_to: to }),
    staleTime: 30 * 1000,
  });

  if (query.isPending) {
    return (
      <div className="space-y-3" role="status" aria-label={t('common.loading')}>
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-20 w-[4.5rem] shrink-0" />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
      </div>
    );
  }
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;

  const days = query.data.days;
  const firstAvailable = days.find((d) => d.slots.length > 0)?.date ?? null;
  if (!firstAvailable)
    return <EmptyState icon={<CalendarX2 />} title={t('booking.noSlotsInRange')} />;

  const pickedStillValid =
    pickedDate && days.some((d) => d.date === pickedDate && d.slots.length > 0);
  const activeDate = pickedStillValid ? pickedDate : firstAvailable;

  return (
    <AvailabilityCalendar
      days={days}
      dateKeys={dateKeys}
      tz={query.data.timezone || tz}
      activeDate={activeDate}
      onSelectDate={(d) => {
        setPickedDate(d);
        onSelect(null);
      }}
      selected={selected}
      onSelectSlot={onSelect}
    />
  );
}
