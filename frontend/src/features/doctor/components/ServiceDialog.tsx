'use client';

import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import type { Branch, Service } from '@/types/api';
import { FormAlert } from '@/components/shared/FormAlert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CheckboxField, Field, NativeSelect } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { doctorApi } from '../api';
import { applyFieldErrors, errorMessage } from '@/lib/api/errors';
import { useFormat, useT } from '@/i18n/provider';
import { doctorKeys } from '../hooks/keys';

/** Create/edit a doctor service (name, type, branch, duration, fee, active). */
export function ServiceDialog({
  service,
  branches,
  onClose,
}: {
  service: Service | null;
  branches: Branch[];
  onClose: () => void;
}) {
  const t = useT();
  const f = useFormat();
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);

  const schema = useMemo(
    () =>
      z
        .object({
          name_ar: z.string().trim().min(1, t('validation.required')).max(150),
          name_en: z.string().trim().min(1, t('validation.required')).max(150),
          consultation_type: z.enum(['in_person', 'online', 'home_visit']),
          clinic_branch_id: z.string(),
          duration_minutes: z.coerce
            .number<string | number>()
            .int()
            .min(5, t('validation.min'))
            .max(240, t('validation.max')),
          price: z.coerce
            .number<string | number>()
            .min(0, t('validation.min'))
            .max(100000, t('validation.max')),
          is_active: z.boolean(),
        })
        .refine((v) => v.consultation_type === 'online' || v.clinic_branch_id !== '', {
          path: ['clinic_branch_id'],
          message: t('validation.required'),
        }),
    [t],
  );
  type Values = z.input<typeof schema>;
  type Output = z.output<typeof schema>;

  const { register, handleSubmit, control, setError, formState } = useForm<Values, unknown, Output>(
    {
      resolver: zodResolver(schema),
      defaultValues: {
        name_ar: service?.name_ar ?? '',
        name_en: service?.name_en ?? '',
        consultation_type: service?.consultation_type ?? (branches.length ? 'in_person' : 'online'),
        clinic_branch_id: service?.branch?.id ?? branches[0]?.id ?? '',
        duration_minutes: service?.duration_minutes ?? 30,
        price: service?.price ?? 300,
        is_active: service?.is_active ?? true,
      },
    },
  );
  const type = useWatch({ control, name: 'consultation_type' });

  const onSubmit = handleSubmit(async (v) => {
    setFormError(null);
    const payload = {
      ...v,
      clinic_branch_id: v.consultation_type === 'online' ? null : v.clinic_branch_id,
    };
    try {
      const res = service
        ? await doctorApi.updateService(service.id, payload)
        : await doctorApi.createService(payload);
      toast.success(res.message || t('common.saved'));
      queryClient.invalidateQueries({ queryKey: doctorKeys.services });
      queryClient.invalidateQueries({ queryKey: doctorKeys.dashboard });
      onClose();
    } catch (e) {
      if (
        !applyFieldErrors(e, setError, [
          'name_ar',
          'name_en',
          'consultation_type',
          'clinic_branch_id',
          'duration_minutes',
          'price',
          'is_active',
        ])
      ) {
        setFormError(errorMessage(e, t));
      }
    }
  });

  return (
    <Dialog open onOpenChange={(o) => !o && !formState.isSubmitting && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {service ? t('doctorDash.editService') : t('doctorDash.addService')}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <FormAlert message={formError} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={t('doctorDash.nameAr')}
              htmlFor="s-name-ar"
              error={formState.errors.name_ar?.message}
              required
            >
              <Input id="s-name-ar" dir="rtl" {...register('name_ar')} />
            </Field>
            <Field
              label={t('doctorDash.nameEn')}
              htmlFor="s-name-en"
              error={formState.errors.name_en?.message}
              required
            >
              <Input id="s-name-en" dir="ltr" {...register('name_en')} />
            </Field>
            <Field
              label={t('doctorDash.consultationType')}
              htmlFor="s-type"
              error={formState.errors.consultation_type?.message}
            >
              <NativeSelect id="s-type" {...register('consultation_type')}>
                {(['in_person', 'online', 'home_visit'] as const).map((c) => (
                  <option key={c} value={c}>
                    {t(`consultation.${c}`)}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            {type !== 'online' && (
              <Field
                label={t('doctorDash.branch')}
                htmlFor="s-branch"
                error={formState.errors.clinic_branch_id?.message}
                required
                hint={branches.length === 0 ? t('doctorDash.noBranches') : undefined}
              >
                <NativeSelect id="s-branch" {...register('clinic_branch_id')}>
                  <option value="">{t('doctorDash.chooseBranch')}</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {[f.l(b.clinic), f.l(b)].filter(Boolean).join(' – ')}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            )}
            <Field
              label={t('doctorDash.duration')}
              htmlFor="s-duration"
              error={formState.errors.duration_minutes?.message}
              required
            >
              <Input
                id="s-duration"
                type="number"
                min={5}
                max={240}
                step={5}
                {...register('duration_minutes')}
              />
            </Field>
            <Field
              label={t('doctorDash.price')}
              htmlFor="s-price"
              error={formState.errors.price?.message}
              required
            >
              <Input id="s-price" type="number" min={0} step={10} {...register('price')} />
            </Field>
          </div>
          <CheckboxField id="s-active" label={t('doctorDash.active')} {...register('is_active')} />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={formState.isSubmitting}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={formState.isSubmitting}>
              {formState.isSubmitting ? t('common.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
