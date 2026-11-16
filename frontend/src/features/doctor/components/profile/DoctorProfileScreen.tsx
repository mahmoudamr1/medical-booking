'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { DoctorSelf } from '../../types';
import { ErrorState, Skeleton } from '@/components/shared/states';
import { PageHeader } from '@/components/shared/PageHeader';
import { FormAlert } from '@/components/shared/FormAlert';
import { VerificationBadge } from '@/components/shared/StatusBadge';
import { useDoctorProfile } from '../../hooks/useDoctorProfile';
import { SpecialtiesForm } from './SpecialtiesForm';
import { PracticeLocations } from './PracticeLocations';
import { doctorApi } from '../../api';
import { doctorKeys } from '../../hooks/keys';
import { FormSection } from '@/components/shared/FormSection';
import { StickySaveBar } from '@/components/shared/StickySaveBar';
import { Field, NativeSelect, Textarea } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { applyFieldErrors, errorMessage } from '@/lib/api/errors';
import { useT } from '@/i18n/provider';

export function DoctorProfileScreen() {
  const t = useT();
  const profile = useDoctorProfile();

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            {t('doctorDash.profileTitle')}
            {profile.data && <VerificationBadge status={profile.data.verification_status} />}
          </span>
        }
        description={t('doctorPanel.profile.subtitle')}
      />
      {profile.isPending ? (
        <div className="space-y-4" role="status" aria-label={t('common.loading')}>
          <Skeleton className="h-72 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      ) : profile.isError ? (
        <ErrorState error={profile.error} onRetry={() => profile.refetch()} />
      ) : (
        <>
          <ProfileForm profile={profile.data} />
          <SpecialtiesForm profile={profile.data} />
          <PracticeLocations />
        </>
      )}
    </div>
  );
}

type ProfileValues = Pick<
  DoctorSelf,
  'title_ar' | 'title_en' | 'bio_ar' | 'bio_en' | 'qualifications' | 'license_number'
> & { years_experience: string; gender: string };
const PROFILE_FIELDS = [
  'title_ar',
  'title_en',
  'bio_ar',
  'bio_en',
  'qualifications',
  'years_experience',
  'gender',
  'license_number',
] as const;
const FORM_ID = 'doctor-profile';

function valuesOf(p: DoctorSelf): ProfileValues {
  return {
    title_ar: p.title_ar ?? '',
    title_en: p.title_en ?? '',
    bio_ar: p.bio_ar ?? '',
    bio_en: p.bio_en ?? '',
    qualifications: p.qualifications ?? '',
    years_experience: String(p.years_experience ?? 0),
    gender: p.gender ?? '',
    license_number: p.license_number ?? '',
  };
}

function ProfileForm({ profile }: { profile: DoctorSelf }) {
  const t = useT();
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const locked = ['pending', 'approved', 'suspended'].includes(profile.verification_status);
  const { register, handleSubmit, setError, reset, formState } = useForm<ProfileValues>({
    defaultValues: valuesOf(profile),
  });

  const onSubmit = handleSubmit(async (v) => {
    setFormError(null);
    try {
      const { data, message } = await doctorApi.updateProfile({
        title_ar: v.title_ar || null,
        title_en: v.title_en || null,
        bio_ar: v.bio_ar || null,
        bio_en: v.bio_en || null,
        qualifications: v.qualifications || null,
        years_experience: Number(v.years_experience) || 0,
        gender: (v.gender || null) as DoctorSelf['gender'],
        ...(locked ? {} : { license_number: v.license_number || null }),
      });
      queryClient.setQueryData(doctorKeys.profile, data);
      reset(valuesOf(data));
      toast.success(message || t('common.saved'));
    } catch (e) {
      if (!applyFieldErrors(e, setError, PROFILE_FIELDS)) setFormError(errorMessage(e, t));
      toast.error(errorMessage(e, t));
    }
  });

  return (
    <form id={FORM_ID} onSubmit={onSubmit} noValidate className="space-y-4">
      <FormSection
        title={t('doctorPanel.profile.publicTitle')}
        description={locked ? t('doctorDash.lockedHint') : t('doctorPanel.profile.publicHint')}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FormAlert message={formError} />
          </div>
          <Field
            label={t('doctorDash.titleAr')}
            htmlFor="d-title-ar"
            error={formState.errors.title_ar?.message}
          >
            <Input id="d-title-ar" dir="rtl" maxLength={150} {...register('title_ar')} />
          </Field>
          <Field
            label={t('doctorDash.titleEn')}
            htmlFor="d-title-en"
            error={formState.errors.title_en?.message}
          >
            <Input id="d-title-en" dir="ltr" maxLength={150} {...register('title_en')} />
          </Field>
          <Field
            label={t('doctorDash.bioAr')}
            htmlFor="d-bio-ar"
            error={formState.errors.bio_ar?.message}
          >
            <Textarea id="d-bio-ar" dir="rtl" rows={4} maxLength={3000} {...register('bio_ar')} />
          </Field>
          <Field
            label={t('doctorDash.bioEn')}
            htmlFor="d-bio-en"
            error={formState.errors.bio_en?.message}
          >
            <Textarea id="d-bio-en" dir="ltr" rows={4} maxLength={3000} {...register('bio_en')} />
          </Field>
          <Field
            label={t('doctorDash.qualifications')}
            htmlFor="d-qual"
            error={formState.errors.qualifications?.message}
            className="sm:col-span-2"
          >
            <Textarea id="d-qual" rows={3} maxLength={3000} {...register('qualifications')} />
          </Field>
        </div>
      </FormSection>
      <FormSection
        title={t('doctorPanel.profile.professionalTitle')}
        description={t('doctorPanel.profile.professionalHint')}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            label={t('doctorDash.yearsExperience')}
            htmlFor="d-years"
            error={formState.errors.years_experience?.message}
          >
            <Input
              id="d-years"
              type="number"
              inputMode="numeric"
              min={0}
              max={70}
              {...register('years_experience')}
            />
          </Field>
          <Field
            label={t('doctorDash.gender')}
            htmlFor="d-gender"
            error={formState.errors.gender?.message}
          >
            <NativeSelect id="d-gender" {...register('gender')}>
              <option value="">{t('patient.notSpecified')}</option>
              <option value="male">{t('patient.male')}</option>
              <option value="female">{t('patient.female')}</option>
            </NativeSelect>
          </Field>
          <Field
            label={t('doctorDash.license')}
            htmlFor="d-license"
            error={formState.errors.license_number?.message}
          >
            <Input
              id="d-license"
              dir="ltr"
              maxLength={50}
              disabled={locked}
              {...register('license_number')}
            />
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
