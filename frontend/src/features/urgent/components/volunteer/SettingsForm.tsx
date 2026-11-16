'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { VolunteerProfile, VolunteerUpdatePayload } from '../../types';
import { FormSection } from '@/components/shared/FormSection';
import { StickySaveBar } from '@/components/shared/StickySaveBar';
import { CoverageAreas, type LocationRow } from './LocationEditor';
import { SpecialtyChecklist } from './SpecialtyChecklist';
import { Checkbox } from '@/components/ui/checkbox';
import { Field } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { URGENT_KEYS } from '../../hooks/keys';
import { volunteerApi } from '../../api';
import { isApiError } from '@/lib/api/client';
import { errorMessage } from '@/lib/api/errors';
import { useFormat, useT } from '@/i18n/provider';
import { cn } from '@/lib/utils';
import { ME_QUERY_KEY } from '@/lib/auth/AuthProvider';

interface Values {
  optIn: boolean;
  specialtyIds: string[];
  locations: LocationRow[];
  online: boolean;
  inPerson: boolean;
  maxConcurrent: string;
}

const FORM_ID = 'volunteer-settings';

function valuesOf(p: VolunteerProfile): Values {
  return {
    optIn: p.opted_in,
    specialtyIds: p.specialties.map((s) => s.id),
    locations: p.locations.map((l) => ({
      governorate_id: l.governorate.id,
      city_id: l.city?.id ?? '',
    })),
    online: p.accepts_online,
    inPerson: p.accepts_in_person,
    maxConcurrent: String(p.max_concurrent_requests || 1),
  };
}

/** Opt-in, specialties, covered areas, modes and capacity (PUT /doctor/volunteer). Read-only when `disabled`. */
export function SettingsForm({
  profile,
  disabled,
}: {
  profile: VolunteerProfile;
  disabled: boolean;
}) {
  const t = useT();
  const f = useFormat();
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(() => valuesOf(profile));
  const [v, setV] = useState(saved);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (patch: Partial<Values>) => setV((cur) => ({ ...cur, ...patch }));
  const dirty = JSON.stringify(v) !== JSON.stringify(saved);
  const off = disabled || !v.optIn;

  const save = useMutation({
    mutationFn: (body: VolunteerUpdatePayload) => volunteerApi.update(body),
    onSuccess: ({ data, message }) => {
      queryClient.setQueryData(URGENT_KEYS.volunteer, data);
      queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });
      const next = valuesOf(data);
      setSaved(next);
      setV(next);
      setErrors({});
      toast.success(message || t('doctorUrgent.volunteer.saved'));
    },
    onError: (e) => {
      if (isApiError(e) && e.errors)
        setErrors(
          Object.fromEntries(Object.entries(e.errors).map(([k, m]) => [k.split('.')[0], m[0]])),
        );
      toast.error(errorMessage(e, t));
    },
  });

  const onSubmit = () => {
    const rows = v.locations.filter((l) => l.governorate_id);
    const local: Record<string, string> = {};
    if (v.optIn && v.specialtyIds.length === 0)
      local.specialty_ids = t('doctorUrgent.volunteer.specialtiesRequired');
    if (v.optIn && rows.length === 0) local.locations = t('doctorUrgent.volunteer.locationsHint');
    if (v.optIn && !v.online && !v.inPerson)
      local.modes = t('doctorUrgent.volunteer.modesRequired');
    setErrors(local);
    if (Object.keys(local).length) return toast.error(t('common.form.fixErrors'));
    save.mutate({
      opt_in: v.optIn,
      specialty_ids: v.specialtyIds,
      locations: rows.map((l) => ({
        governorate_id: l.governorate_id,
        city_id: l.city_id || null,
      })),
      accepts_online: v.online,
      accepts_in_person: v.inPerson,
      max_concurrent_requests: Math.min(10, Math.max(1, Number(v.maxConcurrent) || 1)),
    });
  };

  const fieldError = (key: string) =>
    errors[key] && (
      <p role="alert" className="text-xs font-medium text-destructive">
        {errors[key]}
      </p>
    );

  return (
    <form
      id={FORM_ID}
      className="space-y-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <fieldset disabled={disabled} className="space-y-4">
        <FormSection
          title={t('doctorUrgent.volunteer.profileTitle')}
          description={t('doctorUrgent.volunteer.optInHint')}
        >
          <div className="flex items-start justify-between gap-4 rounded-xl border p-4">
            <div className="space-y-1">
              <Label htmlFor="opt-in" className="text-sm font-medium">
                {t('doctorUrgent.volunteer.optIn')}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t('doctorUrgent.volunteer.optInDetail')}
              </p>
            </div>
            <Switch
              id="opt-in"
              checked={v.optIn}
              onCheckedChange={(optIn) => set({ optIn })}
              disabled={disabled}
            />
          </div>
        </FormSection>

        <FormSection
          title={t('doctorUrgent.volunteer.specialties')}
          description={t('doctorUrgent.volunteer.specialtiesHint')}
          aside={
            <p className="text-xs font-medium text-primary">
              {t('doctorUrgent.volunteer.selectedCount', {
                count: f.number(v.specialtyIds.length),
              })}
            </p>
          }
        >
          <SpecialtyChecklist
            selected={v.specialtyIds}
            onChange={(specialtyIds) => set({ specialtyIds })}
            disabled={off}
            error={errors.specialty_ids}
          />
        </FormSection>

        <FormSection
          title={t('doctorUrgent.volunteer.locations')}
          description={t('doctorUrgent.volunteer.locationsHint')}
        >
          <CoverageAreas
            locations={v.locations}
            onChange={(locations) => set({ locations })}
            disabled={off}
            error={errors.locations}
          />
        </FormSection>

        <FormSection
          title={t('doctorUrgent.volunteer.modes')}
          description={t('doctorUrgent.volunteer.modesHint')}
        >
          <div className={cn('grid gap-4 sm:grid-cols-2', off && 'opacity-60')}>
            <fieldset disabled={off} className="grid gap-2">
              <legend className="mb-1 text-sm font-medium">
                {t('doctorUrgent.volunteer.modes')}
              </legend>
              {(
                [
                  ['online', 'doctorUrgent.volunteer.acceptsOnline'],
                  ['inPerson', 'doctorUrgent.volunteer.acceptsInPerson'],
                ] as const
              ).map(([key, label]) => (
                <label
                  key={key}
                  className="flex min-h-11 items-center gap-3 rounded-lg border px-3"
                >
                  <Checkbox
                    checked={v[key]}
                    disabled={off}
                    onCheckedChange={(val) => set({ [key]: val === true })}
                  />
                  <span className="text-sm">{t(label)}</span>
                </label>
              ))}
              {fieldError('modes')}
            </fieldset>
            <Field
              label={t('doctorUrgent.volunteer.maxConcurrent')}
              htmlFor="max-concurrent"
              error={errors.max_concurrent_requests}
              hint={t('doctorUrgent.volunteer.maxConcurrentHint')}
            >
              <Input
                id="max-concurrent"
                type="number"
                inputMode="numeric"
                min={1}
                max={10}
                value={v.maxConcurrent}
                disabled={off}
                onChange={(e) => set({ maxConcurrent: e.target.value })}
              />
            </Field>
          </div>
        </FormSection>
      </fieldset>

      {!disabled && (
        <StickySaveBar
          dirty={dirty}
          saving={save.isPending}
          form={FORM_ID}
          onDiscard={() => {
            setV(saved);
            setErrors({});
          }}
        />
      )}
    </form>
  );
}
