'use client';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { adminApi } from '../../api';
import type { SpecialtyPayload, AdminSpecialty } from '../../types';
import { FormAlert } from '@/components/shared/FormAlert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CheckboxField, Field, Textarea } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useT } from '@/i18n/provider';
import { applyFieldErrors, errorMessage } from '@/lib/api/errors';

const FIELDS = [
  'slug',
  'name_ar',
  'name_en',
  'description_ar',
  'description_en',
  'icon',
  'is_active',
  'is_general_practice',
  'sort_order',
] as const;

export function SpecialtyDialog({
  specialty,
  onClose,
  onSaved,
}: {
  specialty: AdminSpecialty | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useT();
  const [formError, setFormError] = useState<string | null>(null);

  const schema = useMemo(() => {
    const req = (max: number) =>
      z.string().trim().min(1, t('validation.required')).max(max, t('validation.max'));
    const opt = (max: number) => z.string().trim().max(max, t('validation.max'));
    return z.object({
      slug: req(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, t('admin.specialties.slugInvalid')),
      name_ar: req(100),
      name_en: req(100),
      description_ar: opt(2000),
      description_en: opt(2000),
      icon: opt(50).regex(/^[a-z0-9-]*$/, t('admin.specialties.iconInvalid')),
      is_active: z.boolean(),
      is_general_practice: z.boolean(),
      sort_order: z.coerce
        .number<string | number>({ error: t('validation.number') })
        .int(t('validation.number'))
        .min(0, t('validation.min'))
        .max(1000, t('validation.max')),
    });
  }, [t]);
  type Values = z.input<typeof schema>;
  type Output = z.output<typeof schema>;

  const { register, handleSubmit, setError, formState } = useForm<Values, unknown, Output>({
    resolver: zodResolver(schema),
    defaultValues: {
      slug: specialty?.slug ?? '',
      name_ar: specialty?.name_ar ?? '',
      name_en: specialty?.name_en ?? '',
      description_ar: specialty?.description_ar ?? '',
      description_en: specialty?.description_en ?? '',
      icon: specialty?.icon ?? '',
      is_active: specialty?.is_active ?? true,
      is_general_practice: specialty?.is_general_practice ?? false,
      sort_order: specialty?.sort_order ?? 0,
    },
  });
  const e = formState.errors;

  const onSubmit = handleSubmit(async (v) => {
    setFormError(null);
    const payload: SpecialtyPayload = {
      ...v,
      description_ar: v.description_ar || null,
      description_en: v.description_en || null,
      icon: v.icon || null,
    };
    try {
      const res = specialty
        ? await adminApi.updateSpecialty(specialty.id, payload)
        : await adminApi.createSpecialty(payload);
      toast.success(res.message || t('common.saved'));
      onSaved();
      onClose();
    } catch (err) {
      if (!applyFieldErrors(err, setError, FIELDS)) setFormError(errorMessage(err, t));
    }
  });

  return (
    <Dialog open onOpenChange={(o) => !o && !formState.isSubmitting && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {specialty ? t('admin.specialties.edit') : t('admin.specialties.add')}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <FormAlert message={formError} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={t('admin.specialties.fields.nameAr')}
              htmlFor="sp-name-ar"
              error={e.name_ar?.message}
              required
            >
              <Input
                id="sp-name-ar"
                dir="rtl"
                aria-invalid={!!e.name_ar}
                {...register('name_ar')}
              />
            </Field>
            <Field
              label={t('admin.specialties.fields.nameEn')}
              htmlFor="sp-name-en"
              error={e.name_en?.message}
              required
            >
              <Input
                id="sp-name-en"
                dir="ltr"
                aria-invalid={!!e.name_en}
                {...register('name_en')}
              />
            </Field>
            <Field
              label={t('admin.specialties.fields.slug')}
              htmlFor="sp-slug"
              error={e.slug?.message}
              hint={t('admin.specialties.fields.slugHint')}
              required
            >
              <Input
                id="sp-slug"
                dir="ltr"
                autoCapitalize="none"
                aria-invalid={!!e.slug}
                {...register('slug')}
              />
            </Field>
            <Field
              label={t('admin.specialties.fields.icon')}
              htmlFor="sp-icon"
              error={e.icon?.message}
              hint={t('admin.specialties.fields.iconHint')}
            >
              <Input
                id="sp-icon"
                dir="ltr"
                autoCapitalize="none"
                aria-invalid={!!e.icon}
                {...register('icon')}
              />
            </Field>
            <Field
              label={t('admin.specialties.fields.descriptionAr')}
              htmlFor="sp-desc-ar"
              error={e.description_ar?.message}
            >
              <Textarea id="sp-desc-ar" dir="rtl" rows={3} {...register('description_ar')} />
            </Field>
            <Field
              label={t('admin.specialties.fields.descriptionEn')}
              htmlFor="sp-desc-en"
              error={e.description_en?.message}
            >
              <Textarea id="sp-desc-en" dir="ltr" rows={3} {...register('description_en')} />
            </Field>
            <Field
              label={t('admin.specialties.fields.sortOrder')}
              htmlFor="sp-sort"
              error={e.sort_order?.message}
            >
              <Input
                id="sp-sort"
                type="number"
                min={0}
                max={1000}
                dir="ltr"
                aria-invalid={!!e.sort_order}
                {...register('sort_order')}
              />
            </Field>
          </div>
          <div className="grid gap-3">
            <CheckboxField
              id="sp-active"
              label={t('admin.specialties.fields.isActive')}
              {...register('is_active')}
            />
            <CheckboxField
              id="sp-gp"
              label={t('admin.specialties.fields.isGeneralPractice')}
              {...register('is_general_practice')}
            />
          </div>
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
