'use client';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useClinic } from '../ClinicContext';
import { useClinicBranches } from '../../hooks/useClinicData';
import { clinicApi } from '../../api';
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
import { Field, NativeSelect } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { applyFieldErrors, errorMessage } from '@/lib/api/errors';
import { useFormat, useT } from '@/i18n/provider';

export function AffiliateDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const t = useT();
  const f = useFormat();
  const { clinicId } = useClinic();
  const branches = useClinicBranches(clinicId);
  const [formError, setFormError] = useState<string | null>(null);
  const schema = useMemo(
    () =>
      z.object({
        doctor_email: z
          .string()
          .trim()
          .min(1, t('validation.required'))
          .email(t('validation.email')),
        clinic_branch_id: z.string().min(1, t('validation.required')),
      }),
    [t],
  );
  type Values = z.infer<typeof schema>;
  const { register, handleSubmit, setError, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { doctor_email: '', clinic_branch_id: '' },
  });
  const err = formState.errors;

  const submit = handleSubmit(async (v) => {
    setFormError(null);
    try {
      await clinicApi.affiliate(clinicId, v);
      toast.success(t('clinic.doctors.added'));
      onDone();
      onClose();
    } catch (e) {
      if (!applyFieldErrors(e, setError, ['doctor_email', 'clinic_branch_id']))
        setFormError(errorMessage(e, t));
    }
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader className="text-start">
          <DialogTitle>{t('clinic.doctors.addTitle')}</DialogTitle>
          <DialogDescription>{t('clinic.doctors.addHint')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="space-y-4">
          <FormAlert message={formError} />
          <Field
            label={t('clinic.doctors.doctorEmail')}
            htmlFor="af-email"
            error={err.doctor_email?.message}
            required
          >
            <Input
              id="af-email"
              type="email"
              dir="ltr"
              autoComplete="off"
              aria-invalid={!!err.doctor_email}
              {...register('doctor_email')}
            />
          </Field>
          <Field
            label={t('clinic.doctors.branch')}
            htmlFor="af-branch"
            error={err.clinic_branch_id?.message}
            required
          >
            <NativeSelect
              id="af-branch"
              aria-invalid={!!err.clinic_branch_id}
              {...register('clinic_branch_id')}
            >
              <option value="">{t('clinic.doctors.chooseBranch')}</option>
              {branches.data
                ?.filter((b) => b.is_active)
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {f.l(b)}
                  </option>
                ))}
            </NativeSelect>
          </Field>
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
              {formState.isSubmitting ? t('common.saving') : t('clinic.doctors.add')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
