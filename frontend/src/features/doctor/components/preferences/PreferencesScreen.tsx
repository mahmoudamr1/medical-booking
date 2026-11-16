'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import type { DoctorPreferences } from '../../types';
import { ErrorState, Skeleton } from '@/components/shared/states';
import { PageHeader } from '@/components/shared/PageHeader';
import { FormAlert } from '@/components/shared/FormAlert';

import { FormSection } from '@/components/shared/FormSection';
import { StickySaveBar } from '@/components/shared/StickySaveBar';
import { Field, NativeSelect } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { doctorApi } from '../../api';
import { doctorKeys } from '../../hooks/keys';
import { applyFieldErrors, errorMessage } from '@/lib/api/errors';
import { useT } from '@/i18n/provider';
import { cn } from '@/lib/utils';

const NUMBER_FIELDS = [
  [
    'min_cancellation_hours',
    'doctorDash.minCancellation',
    0,
    168,
    'doctorPanel.preferences.minCancellationHint',
  ],
  ['lead_time_minutes', 'doctorDash.leadTime', 0, 10080, 'doctorPanel.preferences.leadTimeHint'],
  ['horizon_days', 'doctorDash.horizon', 1, 365, 'doctorPanel.preferences.horizonHint'],
  ['buffer_minutes', 'doctorDash.buffer', 0, 120, 'doctorPanel.preferences.bufferHint'],
] as const;

const FORM_ID = 'doctor-preferences';

export function PreferencesScreen() {
  const t = useT();
  const prefs = useQuery({ queryKey: doctorKeys.preferences, queryFn: doctorApi.preferences });
  return (
    <div className="space-y-6">
      <PageHeader
        title={t('doctorDash.preferencesTitle')}
        description={t('doctorPanel.preferences.subtitle')}
      />
      {prefs.isPending ? (
        <div className="space-y-4" role="status" aria-label={t('common.loading')}>
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-56 w-full rounded-xl" />
        </div>
      ) : prefs.isError ? (
        <ErrorState error={prefs.error} onRetry={() => prefs.refetch()} />
      ) : (
        <PreferencesForm initial={prefs.data} />
      )}
    </div>
  );
}

function PreferencesForm({ initial }: { initial: DoctorPreferences }) {
  const t = useT();
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, setError, reset, control, formState } =
    useForm<DoctorPreferences>({ defaultValues: initial });
  const accepts = useWatch({ control, name: 'accepts_bookings' });
  const mode = useWatch({ control, name: 'booking_mode' });

  const onSubmit = handleSubmit(async (v) => {
    setFormError(null);
    try {
      const { data, message } = await doctorApi.updatePreferences({
        ...v,
        min_cancellation_hours: Number(v.min_cancellation_hours),
        lead_time_minutes: Number(v.lead_time_minutes),
        horizon_days: Number(v.horizon_days),
        buffer_minutes: Number(v.buffer_minutes),
      });
      queryClient.setQueryData(doctorKeys.preferences, data);
      queryClient.invalidateQueries({ queryKey: doctorKeys.profile });
      queryClient.invalidateQueries({ queryKey: doctorKeys.dashboard });
      reset(data);
      toast.success(message || t('common.saved'));
    } catch (e) {
      if (
        !applyFieldErrors(e, setError, [
          'accepts_bookings',
          'booking_mode',
          'timezone',
          ...NUMBER_FIELDS.map((n) => n[0]),
        ])
      )
        setFormError(errorMessage(e, t));
      toast.error(errorMessage(e, t));
    }
  });

  return (
    <form id={FORM_ID} onSubmit={onSubmit} noValidate className="space-y-4">
      <FormAlert message={formError} />

      <FormSection
        title={t('doctorPanel.preferences.availabilityTitle')}
        description={t('doctorDash.acceptsBookingsHint')}
      >
        <label
          htmlFor="accepts"
          className={cn(
            'flex min-h-14 cursor-pointer items-center justify-between gap-4 rounded-xl border p-4 transition-colors',
            accepts ? 'border-emerald-200 bg-emerald-50/60' : 'bg-muted/40',
          )}
        >
          <span className="space-y-0.5">
            <span className="block text-sm font-medium">{t('doctorDash.acceptsBookings')}</span>
            <span className="block text-xs text-muted-foreground">
              {accepts
                ? t('doctorPanel.preferences.acceptingOn')
                : t('doctorPanel.preferences.acceptingOff')}
            </span>
          </span>
          <input
            id="accepts"
            type="checkbox"
            className="size-5 shrink-0 cursor-pointer accent-primary"
            {...register('accepts_bookings')}
          />
        </label>
      </FormSection>

      <FormSection
        title={t('doctorDash.bookingMode')}
        description={t('doctorPanel.preferences.modeHint')}
      >
        <div
          className="grid gap-3 sm:grid-cols-2"
          role="radiogroup"
          aria-label={t('doctorDash.bookingMode')}
        >
          {(['instant', 'manual'] as const).map((m) => (
            <label
              key={m}
              className={cn(
                'flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors',
                mode === m ? 'border-primary bg-accent' : 'hover:bg-muted/50',
              )}
            >
              <input
                type="radio"
                value={m}
                className="mt-0.5 size-4 accent-primary"
                {...register('booking_mode')}
              />
              <span className="space-y-0.5">
                <span className="block text-sm font-medium">
                  {t(m === 'instant' ? 'doctorDash.modeInstant' : 'doctorDash.modeManual')}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {t(
                    m === 'instant'
                      ? 'doctorPanel.preferences.instantHint'
                      : 'doctorPanel.preferences.manualHint',
                  )}
                </span>
              </span>
            </label>
          ))}
        </div>
        {formState.errors.booking_mode?.message && (
          <p role="alert" className="mt-2 text-xs text-destructive">
            {formState.errors.booking_mode.message}
          </p>
        )}
      </FormSection>

      <FormSection
        title={t('doctorPanel.preferences.rulesTitle')}
        description={t('doctorPanel.preferences.rulesHint')}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {NUMBER_FIELDS.map(([name, label, min, max, hint]) => (
            <Field
              key={name}
              label={t(label)}
              htmlFor={name}
              error={formState.errors[name]?.message}
              hint={t(hint)}
            >
              <Input
                id={name}
                type="number"
                inputMode="numeric"
                min={min}
                max={max}
                {...register(name, {
                  required: t('validation.required'),
                  min: { value: min, message: t('validation.min') },
                  max: { value: max, message: t('validation.max') },
                })}
              />
            </Field>
          ))}
          <Field label={t('doctorDash.tz')} htmlFor="tz" error={formState.errors.timezone?.message}>
            <NativeSelect id="tz" {...register('timezone')}>
              {Array.from(new Set(['Africa/Cairo', initial.timezone])).map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
      </FormSection>

      <StickySaveBar
        dirty={formState.isDirty}
        saving={formState.isSubmitting}
        form={FORM_ID}
        onDiscard={() => reset()}
      />
    </form>
  );
}
