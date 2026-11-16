'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { FormAlert } from '@/components/shared/FormAlert';
import { LocationCascade, useSpecialties } from '@/features/directory';
import { Button } from '@/components/ui/button';
import { CheckboxField, Field, NativeSelect, Textarea } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { isApiError } from '@/lib/api/client';
import { applyFieldErrors, errorMessage } from '@/lib/api/errors';
import { URGENT_KEYS } from '../hooks/keys';
import { urgentApi } from '../api';
import { useFormat, useT } from '@/i18n/provider';
import type { UrgentDoctorRef } from '../types';
import { ChoiceCards } from './ChoiceCards';
import { OpenRequestNotice } from './OpenRequestNotice';
import {
  REQUEST_FIELDS,
  buildRequestSchema,
  consultationChoices,
  requestDefaults,
  severityChoices,
  toPayload,
  type RequestValues,
} from './requestFormModel';

type Problem =
  { kind: 'open' } | { kind: 'preferred'; name: string } | { kind: 'message'; text: string };

export function UrgentRequestForm({
  preferredDoctor,
  defaultPhone,
  onBroadcastInstead,
}: {
  preferredDoctor: UrgentDoctorRef | null;
  defaultPhone?: string | null;
  /** Called when the chosen doctor is no longer available and the patient sends to everyone instead. */
  onBroadcastInstead: () => void;
}) {
  const t = useT();
  const f = useFormat();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [problem, setProblem] = useState<Problem | null>(null);
  const schema = useMemo(() => buildRequestSchema(t), [t]);
  const specialties = useSpecialties();

  const { register, handleSubmit, control, setValue, setError, formState } = useForm<RequestValues>(
    { resolver: zodResolver(schema), defaultValues: requestDefaults(defaultPhone) },
  );
  const [governorate, city, area, consultationType] = useWatch({
    control,
    name: ['governorate_id', 'city_id', 'area_id', 'consultation_type'],
  });
  const errors = formState.errors;
  const inPerson = consultationType === 'in_person';

  const send = async (v: RequestValues, preferredId: string | null) => {
    setProblem(null);
    try {
      const { data } = await urgentApi.create(toPayload(v, preferredId));
      toast.success(t('urgent.form.created'));
      queryClient.invalidateQueries({ queryKey: URGENT_KEYS.patientAll });
      queryClient.setQueryData(URGENT_KEYS.request(data.id), data);
      router.push(`/urgent/${data.id}`);
    } catch (e) {
      if (isApiError(e) && e.code === 'urgent_open_exists') {
        setProblem({ kind: 'open' });
        queryClient.invalidateQueries({ queryKey: URGENT_KEYS.patientAll });
      } else if (isApiError(e) && e.code === 'preferred_doctor_unavailable' && preferredDoctor)
        setProblem({ kind: 'preferred', name: preferredDoctor.name });
      else if (isApiError(e) && e.status === 429)
        setProblem({ kind: 'message', text: t('urgent.request.rateLimited') });
      else if (!applyFieldErrors(e, setError, REQUEST_FIELDS))
        setProblem({ kind: 'message', text: errorMessage(e, t) });
    }
  };
  const onSubmit = handleSubmit((v) => send(v, preferredDoctor?.id ?? null));
  const sendToAll = () => {
    onBroadcastInstead();
    void handleSubmit((v) => send(v, null))();
  };

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5">
      {problem?.kind === 'open' && <OpenRequestNotice message={t('urgent.request.openExists')} />}
      {problem?.kind === 'message' && <FormAlert message={problem.text} />}
      {problem?.kind === 'preferred' && (
        <div
          role="alert"
          className="grid gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
        >
          <p>{t('urgent.request.preferredUnavailable', { name: problem.name })}</p>
          <Button type="button" size="lg" onClick={sendToAll} disabled={formState.isSubmitting}>
            {t('urgent.request.sendToAll')}
          </Button>
        </div>
      )}

      <ChoiceCards
        legend={t('urgent.severity.label')}
        hint={t('urgent.severity.hint')}
        choices={severityChoices(t)}
        registration={register('severity')}
        error={errors.severity?.message}
        columns={3}
      />

      <Field
        label={t('urgent.form.description')}
        htmlFor="u-description"
        error={errors.description?.message}
        hint={t('urgent.form.descriptionHint')}
        required
      >
        <Textarea
          id="u-description"
          rows={4}
          maxLength={1000}
          placeholder={t('urgent.form.descriptionPlaceholder')}
          aria-invalid={!!errors.description}
          {...register('description')}
        />
      </Field>

      <Field
        label={`${t('urgent.form.specialty')} (${t('common.optional')})`}
        htmlFor="u-specialty"
        hint={t('urgent.form.specialtyHint')}
      >
        <NativeSelect
          id="u-specialty"
          disabled={specialties.isPending}
          {...register('specialty_id')}
        >
          <option value="">{t('urgent.form.specialtyAny')}</option>
          {specialties.data?.map((s) => (
            <option key={s.id} value={s.id}>
              {f.l(s)}
            </option>
          ))}
        </NativeSelect>
      </Field>

      <ChoiceCards
        legend={t('urgent.form.consultationType')}
        choices={consultationChoices(t)}
        registration={register('consultation_type')}
        error={errors.consultation_type?.message}
      />

      <LocationCascade
        idPrefix="u"
        showArea
        required={{ governorate: true }}
        value={{ governorate, city, area }}
        errors={{ governorate: errors.governorate_id?.message }}
        labels={{
          governorate: t('urgent.form.governorate'),
          city: t('urgent.form.city'),
          area: t('urgent.form.area'),
          anyGovernorate: t('urgent.form.selectGovernorate'),
          anyCity: t('urgent.form.anyCity'),
          anyArea: t('urgent.form.anyArea'),
        }}
        onChange={(next) => {
          setValue('governorate_id', next.governorate, { shouldValidate: formState.isSubmitted });
          setValue('city_id', next.city);
          setValue('area_id', next.area);
        }}
      />

      <Field
        label={
          inPerson
            ? t('urgent.form.locationDetails')
            : `${t('urgent.form.locationDetails')} (${t('common.optional')})`
        }
        htmlFor="u-location"
        error={errors.location_details?.message}
        hint={t('urgent.form.locationDetailsHint')}
        required={inPerson}
      >
        <Textarea
          id="u-location"
          rows={2}
          maxLength={500}
          placeholder={t('urgent.form.locationDetailsPlaceholder')}
          aria-invalid={!!errors.location_details}
          {...register('location_details')}
        />
      </Field>

      <Field
        label={t('urgent.form.contactPhone')}
        htmlFor="u-phone"
        error={errors.contact_phone?.message}
        hint={t('urgent.form.contactPhoneHint')}
        required
      >
        <Input
          id="u-phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          dir="ltr"
          className="text-start"
          aria-invalid={!!errors.contact_phone}
          {...register('contact_phone')}
        />
      </Field>

      <div className="grid gap-1 rounded-xl border bg-muted/40 p-4">
        <CheckboxField
          id="u-consent"
          label={t('urgent.form.consent')}
          aria-invalid={!!errors.consent}
          {...register('consent')}
        />
        {errors.consent && (
          <p role="alert" className="ps-8 text-xs font-medium text-destructive sm:ps-7">
            {errors.consent.message}
          </p>
        )}
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={formState.isSubmitting}>
        {formState.isSubmitting ? t('urgent.form.submitting') : t('urgent.form.submit')}
      </Button>
    </form>
  );
}
