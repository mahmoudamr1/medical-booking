'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { DoctorSelf } from '../../types';
import type { Specialty } from '@/types/api';
import { ErrorState, LoadingState } from '@/components/shared/states';
import { FormAlert } from '@/components/shared/FormAlert';
import { useSpecialties } from '@/features/directory';

import { FormSection } from '@/components/shared/FormSection';
import { Button } from '@/components/ui/button';
import { doctorApi } from '../../api';
import { errorMessage } from '@/lib/api/errors';
import { useFormat, useT } from '@/i18n/provider';
import { cn } from '@/lib/utils';
import { doctorKeys } from '../../hooks/keys';

const MAX = 3;

/** Up to three specialties with one primary (PUT /doctor/specialties); locked during review. */
export function SpecialtiesForm({ profile }: { profile: DoctorSelf }) {
  const t = useT();
  const f = useFormat();
  const queryClient = useQueryClient();
  const all = useSpecialties();
  const [selected, setSelected] = useState<string[]>(() =>
    (profile.specialties ?? []).map((s) => s.id),
  );
  const [primary, setPrimary] = useState<string | null>(
    () =>
      profile.specialties?.find((s) => s.is_primary)?.id ?? profile.specialties?.[0]?.id ?? null,
  );
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const locked = profile.verification_status === 'pending';

  const toggle = (s: Specialty) => {
    setFormError(null);
    if (selected.includes(s.id)) {
      const next = selected.filter((id) => id !== s.id);
      setSelected(next);
      if (primary === s.id) setPrimary(next[0] ?? null);
    } else if (selected.length >= MAX) {
      setFormError(t('doctorDash.maxSpecialties'));
    } else {
      setSelected([...selected, s.id]);
      if (!primary) setPrimary(s.id);
    }
  };

  const save = async () => {
    if (!primary || selected.length === 0) return setFormError(t('validation.required'));
    setSaving(true);
    setFormError(null);
    try {
      const { data, message } = await doctorApi.updateSpecialties(selected, primary);
      queryClient.setQueryData(doctorKeys.profile, data);
      toast.success(message || t('common.saved'));
    } catch (e) {
      setFormError(errorMessage(e, t));
      toast.error(errorMessage(e, t));
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormSection
      title={t('doctorDash.specialtiesTitle')}
      description={locked ? t('verification.bannerPending') : t('doctorDash.specialtiesHint')}
    >
      {all.isPending ? (
        <LoadingState />
      ) : all.isError ? (
        <ErrorState error={all.error} onRetry={() => all.refetch()} />
      ) : (
        <div className="space-y-4">
          <FormAlert message={formError} />
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {all.data.map((s) => {
              const checked = selected.includes(s.id);
              return (
                <div
                  key={s.id}
                  className={cn(
                    'flex min-h-11 items-center justify-between gap-2 rounded-lg border px-3 py-1.5',
                    checked ? 'border-primary bg-accent' : 'border-border',
                  )}
                >
                  <label className="flex flex-1 cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={checked}
                      disabled={locked}
                      onChange={() => toggle(s)}
                    />
                    {f.l(s)}
                  </label>
                  {checked && (
                    <label className="flex cursor-pointer items-center gap-1 text-xs text-muted-foreground">
                      <input
                        type="radio"
                        name="primary"
                        className="accent-primary"
                        checked={primary === s.id}
                        disabled={locked}
                        onChange={() => setPrimary(s.id)}
                      />
                      {t('doctorDash.primary')}
                    </label>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex justify-end">
            <Button onClick={save} disabled={saving || locked}>
              {saving ? t('common.saving') : t('doctorDash.saveSpecialties')}
            </Button>
          </div>
        </div>
      )}
    </FormSection>
  );
}
