'use client';

import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import type { Branch } from '@/types/api';
import { FormAlert } from '@/components/shared/FormAlert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CheckboxField, Field } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { clinicApi } from '../api';
import { clinicKeys } from '../hooks/keys';
import { isApiError } from '@/lib/api/client';
import { applyFieldErrors, errorMessage } from '@/lib/api/errors';
import { useT } from '@/i18n/provider';
import { LocationCascade, type LocationValue } from '@/features/directory';
import { useClinic } from './ClinicContext';

const PHONE = /^\+?[0-9]{7,15}$/; // BranchController::validated
const FIELDS = ['name_ar', 'name_en', 'address_ar', 'address_en', 'phone', 'is_active'] as const;

/** Create (branch = null) or edit a clinic branch. */
export function BranchFormDialog({
  branch,
  onClose,
}: {
  branch: Branch | null;
  onClose: () => void;
}) {
  const t = useT();
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader className="text-start">
          <DialogTitle>{branch ? t('clinic.branches.edit') : t('clinic.branches.add')}</DialogTitle>
          <DialogDescription>{t('clinic.branches.subtitle')}</DialogDescription>
        </DialogHeader>
        <BranchForm branch={branch} onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
}

function BranchForm({ branch, onClose }: { branch: Branch | null; onClose: () => void }) {
  const t = useT();
  const queryClient = useQueryClient();
  const { clinicId } = useClinic();
  const [formError, setFormError] = useState<string | null>(null);
  const [location, setLocation] = useState<LocationValue>({
    governorate: branch?.governorate?.id ?? '',
    city: branch?.city?.id ?? '',
    area: branch?.area?.id ?? '',
  });
  const [locationErrors, setLocationErrors] = useState<
    Partial<Record<keyof LocationValue, string>>
  >({});

  const schema = useMemo(
    () =>
      z.object({
        name_ar: z.string().trim().min(1, t('validation.required')).max(150, t('validation.max')),
        name_en: z.string().trim().min(1, t('validation.required')).max(150, t('validation.max')),
        address_ar: z
          .string()
          .trim()
          .min(1, t('validation.required'))
          .max(255, t('validation.max')),
        address_en: z.string().trim().max(255, t('validation.max')),
        phone: z
          .string()
          .trim()
          .refine((v) => v === '' || PHONE.test(v), t('validation.phone')),
        is_active: z.boolean(),
      }),
    [t],
  );
  type Values = z.infer<typeof schema>;
  const { register, handleSubmit, setError, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name_ar: branch?.name_ar ?? '',
      name_en: branch?.name_en ?? '',
      address_ar: branch?.address_ar ?? '',
      address_en: branch?.address_en ?? '',
      phone: branch?.phone ?? '',
      is_active: branch?.is_active ?? true,
    },
  });
  const err = formState.errors;

  const submit = handleSubmit(async (v) => {
    setFormError(null);
    const locErr: Partial<Record<keyof LocationValue, string>> = {};
    if (!location.governorate) locErr.governorate = t('validation.required');
    if (!location.city) locErr.city = t('validation.required');
    setLocationErrors(locErr);
    if (Object.keys(locErr).length) return;

    const body = {
      name_ar: v.name_ar,
      name_en: v.name_en,
      city_id: location.city,
      area_id: location.area || null,
      address_ar: v.address_ar,
      address_en: v.address_en || null,
      phone: v.phone || null,
      is_active: v.is_active,
    };
    try {
      if (branch) await clinicApi.updateBranch(clinicId, branch.id, body);
      else await clinicApi.createBranch(clinicId, body);
      toast.success(t('common.saved'));
      queryClient.invalidateQueries({ queryKey: clinicKeys.of(clinicId, 'branches') });
      onClose();
    } catch (e) {
      const applied = applyFieldErrors(e, setError, FIELDS);
      const city = isApiError(e) ? (e.fieldError('city_id') ?? e.fieldError('area_id')) : undefined;
      if (city) setLocationErrors({ city });
      if (!applied && !city) setFormError(errorMessage(e, t));
    }
  });

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <FormAlert message={formError} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t('clinic.branches.nameAr')}
          htmlFor="br-name-ar"
          error={err.name_ar?.message}
          required
        >
          <Input
            id="br-name-ar"
            dir="rtl"
            maxLength={150}
            aria-invalid={!!err.name_ar}
            {...register('name_ar')}
          />
        </Field>
        <Field
          label={t('clinic.branches.nameEn')}
          htmlFor="br-name-en"
          error={err.name_en?.message}
          required
        >
          <Input
            id="br-name-en"
            dir="ltr"
            maxLength={150}
            aria-invalid={!!err.name_en}
            {...register('name_en')}
          />
        </Field>
      </div>
      <LocationCascade
        idPrefix="br-loc"
        value={location}
        onChange={(v) => {
          setLocation(v);
          setLocationErrors({});
        }}
        showArea
        required={{ governorate: true, city: true }}
        errors={locationErrors}
        labels={{
          governorate: t('clinic.branches.governorate'),
          city: t('clinic.branches.city'),
          area: t('clinic.branches.area'),
          anyGovernorate: t('clinic.branches.choose'),
          anyCity: t('clinic.branches.choose'),
          anyArea: t('clinic.branches.none'),
        }}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t('clinic.branches.addressAr')}
          htmlFor="br-addr-ar"
          error={err.address_ar?.message}
          required
        >
          <Input
            id="br-addr-ar"
            dir="rtl"
            maxLength={255}
            aria-invalid={!!err.address_ar}
            {...register('address_ar')}
          />
        </Field>
        <Field
          label={t('clinic.branches.addressEn')}
          htmlFor="br-addr-en"
          error={err.address_en?.message}
        >
          <Input
            id="br-addr-en"
            dir="ltr"
            maxLength={255}
            aria-invalid={!!err.address_en}
            {...register('address_en')}
          />
        </Field>
        <Field label={t('clinic.branches.phone')} htmlFor="br-phone" error={err.phone?.message}>
          <Input
            id="br-phone"
            type="tel"
            dir="ltr"
            inputMode="tel"
            aria-invalid={!!err.phone}
            {...register('phone')}
          />
        </Field>
      </div>
      <CheckboxField
        id="br-active"
        label={t('clinic.branches.isActive')}
        {...register('is_active')}
      />
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={formState.isSubmitting}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? t('common.saving') : t('common.save')}
        </Button>
      </DialogFooter>
    </form>
  );
}
