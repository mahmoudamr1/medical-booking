'use client';

import { STAFF_ROLES } from './StaffScreen';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useClinic } from '../ClinicContext';
import { roleKey } from '../ClinicSwitcher';
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
import { useT } from '@/i18n/provider';

export function InviteDialog({
  onClose,
  onInvited,
}: {
  onClose: () => void;
  onInvited: () => void;
}) {
  const t = useT();
  const { clinicId } = useClinic();
  const [formError, setFormError] = useState<string | null>(null);
  const schema = useMemo(
    () =>
      z.object({
        email: z.string().trim().min(1, t('validation.required')).email(t('validation.email')),
        role: z.enum(['manager', 'receptionist']),
      }),
    [t],
  );
  type Values = z.infer<typeof schema>;
  const { register, handleSubmit, setError, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', role: 'receptionist' },
  });

  const submit = handleSubmit(async (v) => {
    setFormError(null);
    try {
      await clinicApi.invite(clinicId, v);
      toast.success(t('clinic.staff.invited'));
      onInvited();
      onClose();
    } catch (e) {
      if (!applyFieldErrors(e, setError, ['email', 'role'])) setFormError(errorMessage(e, t));
    }
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader className="text-start">
          <DialogTitle>{t('clinic.staff.inviteTitle')}</DialogTitle>
          <DialogDescription>{t('clinic.staff.inviteHint')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="space-y-4">
          <FormAlert message={formError} />
          <Field
            label={t('clinic.staff.email')}
            htmlFor="inv-email"
            error={formState.errors.email?.message}
            required
          >
            <Input
              id="inv-email"
              type="email"
              dir="ltr"
              autoComplete="off"
              aria-invalid={!!formState.errors.email}
              {...register('email')}
            />
          </Field>
          <Field
            label={t('clinic.staff.role')}
            htmlFor="inv-role"
            error={formState.errors.role?.message}
            required
          >
            <NativeSelect id="inv-role" {...register('role')}>
              {STAFF_ROLES.map((r) => (
                <option key={r} value={r}>
                  {t(roleKey(r))}
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
              {formState.isSubmitting ? t('common.saving') : t('clinic.staff.invite')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
