'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useForm, useWatch } from 'react-hook-form';
import { CalendarOff, Clock, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { FormAlert } from '@/components/shared/FormAlert';
import { useBranchLabel, useDoctorBranches } from '../hooks/useDoctorProfile';
import { FormSection } from '@/components/shared/FormSection';
import { Button } from '@/components/ui/button';
import { Field, NativeSelect } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { doctorApi } from '../api';
import type { ExceptionPayload } from '../types';
import { applyFieldErrors, errorMessage } from '@/lib/api/errors';
import { todayKey, BUSINESS_TZ } from '@/lib/dates';
import { useT } from '@/i18n/provider';
import { cn } from '@/lib/utils';
import { doctorKeys } from '../hooks/keys';

interface FormValues {
  date: string;
  date_to: string;
  type: 'closed' | 'custom_hours';
  starts_at: string;
  ends_at: string;
  clinic_branch_id: string;
  reason: string;
}

const FIELDS = [
  'date',
  'date_to',
  'type',
  'starts_at',
  'ends_at',
  'clinic_branch_id',
  'reason',
] as const;

/** Invalidates the exception list and the dashboard (next available slot) after a change. */
export function useRefreshExceptions() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: doctorKeys.exceptions });
    queryClient.invalidateQueries({ queryKey: doctorKeys.dashboard });
  };
}

/** Add a closed day/range or custom hours (POST /doctor/exceptions). */
export function ExceptionForm() {
  const t = useT();
  const refresh = useRefreshExceptions();
  const branches = useDoctorBranches();
  const branchName = useBranchLabel();
  const [formError, setFormError] = useState<string | null>(null);
  const today = todayKey(BUSINESS_TZ);

  const { register, handleSubmit, control, setError, reset, formState } = useForm<FormValues>({
    defaultValues: {
      date: today,
      date_to: '',
      type: 'closed',
      starts_at: '10:00',
      ends_at: '14:00',
      clinic_branch_id: '',
      reason: '',
    },
  });
  const type = useWatch({ control, name: 'type' });

  const onSubmit = handleSubmit(async (v) => {
    setFormError(null);
    if (v.type === 'custom_hours' && v.ends_at <= v.starts_at) {
      setError('ends_at', { message: t('validation.timeOrder') });
      return;
    }
    if (v.date_to && v.date_to < v.date) {
      setError('date_to', { message: t('validation.timeOrder') });
      return;
    }
    const payload: ExceptionPayload = {
      date: v.date,
      date_to: v.date_to || undefined,
      type: v.type,
      starts_at: v.type === 'custom_hours' ? v.starts_at : undefined,
      ends_at: v.type === 'custom_hours' ? v.ends_at : undefined,
      clinic_branch_id: v.clinic_branch_id || null,
      reason: v.reason || undefined,
    };
    try {
      const { message } = await doctorApi.createException(payload);
      toast.success(message || t('common.saved'));
      reset();
      refresh();
    } catch (e) {
      if (!applyFieldErrors(e, setError, FIELDS)) setFormError(errorMessage(e, t));
      toast.error(errorMessage(e, t));
    }
  });

  return (
    <FormSection
      title={t('doctorDash.addException')}
      description={t('doctorPanel.exceptions.formHint')}
    >
      <form onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FormAlert message={formError} />
        </div>
        <Field
          label={t('doctorDash.exceptionType')}
          htmlFor="ex-type"
          error={formState.errors.type?.message}
          className="sm:col-span-2"
        >
          <div className="grid gap-2 sm:grid-cols-2" id="ex-type" role="radiogroup">
            {(['closed', 'custom_hours'] as const).map((v) => (
              <label
                key={v}
                className={cn(
                  'flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 text-sm',
                  type === v ? 'border-primary bg-accent' : 'hover:bg-muted/50',
                )}
              >
                <input
                  type="radio"
                  value={v}
                  className="size-4 accent-primary"
                  {...register('type')}
                />
                {v === 'closed' ? (
                  <CalendarOff className="size-4 text-muted-foreground" aria-hidden />
                ) : (
                  <Clock className="size-4 text-muted-foreground" aria-hidden />
                )}
                {t(v === 'closed' ? 'doctorDash.exceptionClosed' : 'doctorDash.exceptionCustom')}
              </label>
            ))}
          </div>
        </Field>
        <Field
          label={t('doctorDash.exceptionDate')}
          htmlFor="ex-date"
          error={formState.errors.date?.message}
          required
        >
          <Input
            id="ex-date"
            type="date"
            min={today}
            {...register('date', { required: t('validation.required') })}
          />
        </Field>
        <Field
          label={t('doctorDash.exceptionDateTo')}
          htmlFor="ex-date-to"
          error={formState.errors.date_to?.message}
        >
          <Input id="ex-date-to" type="date" min={today} {...register('date_to')} />
        </Field>
        {type === 'custom_hours' && (
          <>
            <Field
              label={t('common.from')}
              htmlFor="ex-start"
              error={formState.errors.starts_at?.message}
              required
            >
              <Input id="ex-start" type="time" {...register('starts_at')} />
            </Field>
            <Field
              label={t('common.to')}
              htmlFor="ex-end"
              error={formState.errors.ends_at?.message}
              required
            >
              <Input id="ex-end" type="time" {...register('ends_at')} />
            </Field>
          </>
        )}
        <Field
          label={t('doctorDash.location')}
          htmlFor="ex-branch"
          error={formState.errors.clinic_branch_id?.message}
        >
          <NativeSelect id="ex-branch" {...register('clinic_branch_id')}>
            <option value="">{t('doctorDash.allLocations')}</option>
            {branches.data?.map((b) => (
              <option key={b.id} value={b.id}>
                {branchName(b.id)}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field
          label={`${t('common.reason')} (${t('common.optional')})`}
          htmlFor="ex-reason"
          error={formState.errors.reason?.message}
        >
          <Input id="ex-reason" maxLength={255} {...register('reason')} />
        </Field>
        <div className="flex justify-end sm:col-span-2">
          <Button type="submit" disabled={formState.isSubmitting} className="w-full sm:w-auto">
            <Plus aria-hidden />
            {formState.isSubmitting ? t('common.saving') : t('doctorDash.addException')}
          </Button>
        </div>
      </form>
    </FormSection>
  );
}
