'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useForm, useWatch } from 'react-hook-form';
import { Building2, MapPin, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { ErrorState, LoadingState } from '@/components/shared/states';
import { EmptyState } from '@/components/shared/EmptyState';
import { FormAlert } from '@/components/shared/FormAlert';
import { useAreas, useCities, useGovernorates } from '@/features/directory';
import { useDoctorBranches } from '../../hooks/useDoctorProfile';
import { FormSection } from '@/components/shared/FormSection';
import { Button } from '@/components/ui/button';
import { Field, NativeSelect } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { doctorApi } from '../../api';
import type { PracticePayload } from '../../types';
import { applyFieldErrors, errorMessage } from '@/lib/api/errors';
import { useFormat, useT } from '@/i18n/provider';
import { doctorKeys } from '../../hooks/keys';

/** Practice locations (branches) with an inline form to add a private clinic. */
export function PracticeLocations() {
  const t = useT();
  const f = useFormat();
  const branches = useDoctorBranches();
  const [adding, setAdding] = useState(false);

  return (
    <FormSection
      title={t('doctorDash.locationsTitle')}
      description={t('doctorPanel.profile.locationsHint')}
    >
      {branches.isPending ? (
        <LoadingState />
      ) : branches.isError ? (
        <ErrorState error={branches.error} onRetry={() => branches.refetch()} />
      ) : (
        <div className="space-y-4">
          {branches.data.length === 0 ? (
            <EmptyState compact icon={Building2} title={t('doctorDash.noLocations')} />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {branches.data.map((b) => (
                <li key={b.id} className="rounded-lg border p-4">
                  <p className="font-semibold text-foreground">{f.l(b.clinic)}</p>
                  <p className="text-sm text-muted-foreground">{f.l(b)}</p>
                  <p className="mt-1 flex items-start gap-1 text-sm text-muted-foreground">
                    <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
                    {[f.l(b, 'address'), f.l(b.area), f.l(b.city), f.l(b.governorate)]
                      .filter(Boolean)
                      .join('، ')}
                  </p>
                </li>
              ))}
            </ul>
          )}
          {adding ? (
            <PracticeForm onDone={() => setAdding(false)} />
          ) : (
            <Button variant="outline" onClick={() => setAdding(true)}>
              <Plus aria-hidden />
              {t('doctorDash.addPractice')}
            </Button>
          )}
        </div>
      )}
    </FormSection>
  );
}

type PracticeValues = Required<Omit<PracticePayload, 'city_id'>> & {
  governorate_id: string;
  city_id: string;
};
const PRACTICE_FIELDS = [
  'name_ar',
  'name_en',
  'city_id',
  'area_id',
  'address_ar',
  'address_en',
  'phone',
] as const;

function PracticeForm({ onDone }: { onDone: () => void }) {
  const t = useT();
  const f = useFormat();
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, control, setValue, setError, formState } =
    useForm<PracticeValues>({
      defaultValues: {
        name_ar: '',
        name_en: '',
        governorate_id: '',
        city_id: '',
        area_id: '',
        address_ar: '',
        address_en: '',
        phone: '',
      },
    });
  const gov = useWatch({ control, name: 'governorate_id' });
  const city = useWatch({ control, name: 'city_id' });
  const governorates = useGovernorates();
  const cities = useCities(gov);
  const areas = useAreas(city);

  const onSubmit = handleSubmit(async (v) => {
    setFormError(null);
    try {
      const { message } = await doctorApi.createPractice({
        name_ar: v.name_ar,
        name_en: v.name_en || undefined,
        city_id: v.city_id,
        area_id: v.area_id || undefined,
        address_ar: v.address_ar,
        address_en: v.address_en || undefined,
        phone: v.phone || undefined,
      });
      toast.success(message || t('doctorDash.practiceCreated'));
      queryClient.invalidateQueries({ queryKey: doctorKeys.branches });
      queryClient.invalidateQueries({ queryKey: doctorKeys.profile });
      onDone();
    } catch (e) {
      if (!applyFieldErrors(e, setError, PRACTICE_FIELDS)) setFormError(errorMessage(e, t));
    }
  });

  const req = { required: t('validation.required') };
  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="grid gap-4 rounded-lg border border-dashed p-4 sm:grid-cols-2"
    >
      <div className="sm:col-span-2">
        <FormAlert message={formError} />
      </div>
      <Field
        label={t('doctorDash.practiceName')}
        htmlFor="pr-name-ar"
        error={formState.errors.name_ar?.message}
        required
      >
        <Input id="pr-name-ar" dir="rtl" {...register('name_ar', req)} />
      </Field>
      <Field
        label={t('doctorDash.practiceNameEn')}
        htmlFor="pr-name-en"
        error={formState.errors.name_en?.message}
      >
        <Input id="pr-name-en" dir="ltr" {...register('name_en')} />
      </Field>
      <Field label={t('search.governorate')} htmlFor="pr-gov" required>
        <NativeSelect
          id="pr-gov"
          {...register('governorate_id', {
            ...req,
            onChange: () => {
              setValue('city_id', '');
              setValue('area_id', '');
            },
          })}
        >
          <option value="">—</option>
          {governorates.data?.map((g) => (
            <option key={g.id} value={g.id}>
              {f.l(g)}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field
        label={t('search.city')}
        htmlFor="pr-city"
        error={formState.errors.city_id?.message}
        required
      >
        <NativeSelect
          id="pr-city"
          disabled={!gov}
          {...register('city_id', { ...req, onChange: () => setValue('area_id', '') })}
        >
          <option value="">—</option>
          {cities.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {f.l(c)}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label={t('search.area')} htmlFor="pr-area" error={formState.errors.area_id?.message}>
        <NativeSelect id="pr-area" disabled={!city || !areas.data?.length} {...register('area_id')}>
          <option value="">—</option>
          {areas.data?.map((a) => (
            <option key={a.id} value={a.id}>
              {f.l(a)}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label={t('auth.phone')} htmlFor="pr-phone" error={formState.errors.phone?.message}>
        <Input id="pr-phone" type="tel" dir="ltr" {...register('phone')} />
      </Field>
      <Field
        label={t('doctorDash.addressAr')}
        htmlFor="pr-addr-ar"
        error={formState.errors.address_ar?.message}
        required
      >
        <Input id="pr-addr-ar" dir="rtl" {...register('address_ar', req)} />
      </Field>
      <Field
        label={t('doctorDash.addressEn')}
        htmlFor="pr-addr-en"
        error={formState.errors.address_en?.message}
      >
        <Input id="pr-addr-en" dir="ltr" {...register('address_en')} />
      </Field>
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? t('common.saving') : t('common.save')}
        </Button>
        <Button type="button" variant="outline" onClick={onDone}>
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  );
}
