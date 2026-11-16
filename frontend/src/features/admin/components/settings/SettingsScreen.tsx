'use client';

import { IntField } from './IntField';
import { makeSchema, KEYS, IntKey, BOUNDS } from './settingsSchema';
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { adminApi } from '../../api';
import { adminKeys } from '../../hooks/keys';
import type { PlatformSettings } from '../../types';
import { FormAlert } from '@/components/shared/FormAlert';
import { StickySaveBar } from '@/components/shared/StickySaveBar';
import { ErrorState, LoadingState, Section } from '@/components/shared/states';
import { PageHeader } from '@/components/shared/PageHeader';
import { CheckboxField } from '@/components/ui/form';
import { useFormat, useT } from '@/i18n/provider';
import { applyFieldErrors, errorMessage } from '@/lib/api/errors';

export function SettingsScreen() {
  const t = useT();
  const settings = useQuery({ queryKey: adminKeys.settings, queryFn: adminApi.settings });

  return (
    <div className="space-y-6">
      <PageHeader title={t('admin.settings.title')} description={t('admin.settings.subtitle')} />
      {settings.isPending ? (
        <LoadingState rows={3} />
      ) : settings.isError ? (
        <ErrorState error={settings.error} onRetry={() => settings.refetch()} />
      ) : (
        // Remount the form with fresh defaults whenever the server copy changes.
        <SettingsForm key={JSON.stringify(settings.data)} initial={settings.data} />
      )}
    </div>
  );
}

function SettingsForm({ initial }: { initial: PlatformSettings }) {
  const t = useT();
  const f = useFormat();
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const schema = useMemo(() => makeSchema(t, (n) => f.number(n, 0)), [t, f]);
  type Values = z.input<typeof schema>;
  type Output = z.output<typeof schema>;

  const { register, handleSubmit, reset, setError, formState } = useForm<Values, unknown, Output>({
    resolver: zodResolver(schema),
    defaultValues: initial,
  });
  const { errors, isDirty, isSubmitting, dirtyFields } = formState;

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    // Send only what changed so the audit log's before/after stays precise.
    const changed = Object.fromEntries(
      Object.entries(values).filter(([k]) => dirtyFields[k as keyof Values]),
    ) as Partial<PlatformSettings>;
    try {
      const res = await adminApi.updateSettings(changed);
      toast.success(res.message || t('common.saved'));
      queryClient.setQueryData(adminKeys.settings, res.data);
      queryClient.invalidateQueries({ queryKey: adminKeys.audit });
    } catch (e) {
      if (!applyFieldErrors(e, setError, KEYS)) setFormError(errorMessage(e, t));
    }
  });

  const hintFor = (key: IntKey) =>
    t('admin.settings.range', {
      min: f.number(BOUNDS[key][0], 0),
      max: f.number(BOUNDS[key][1], 0),
    });

  return (
    <form
      id="admin-settings"
      onSubmit={onSubmit}
      noValidate
      className="space-y-6"
      aria-label={t('admin.settings.title')}
    >
      <FormAlert message={formError} />

      <Section title={t('admin.settings.sections.booking')}>
        <div className="grid gap-5 sm:grid-cols-2">
          <IntField
            name="pending_hold_minutes"
            label={t('admin.settings.fields.pending_hold_minutes')}
            hint={hintFor('pending_hold_minutes')}
            register={register}
            errors={errors}
          />
          <IntField
            name="reminder_hours_before"
            label={t('admin.settings.fields.reminder_hours_before')}
            hint={hintFor('reminder_hours_before')}
            register={register}
            errors={errors}
          />
        </div>
      </Section>

      <Section title={t('admin.settings.sections.urgent')}>
        <div className="space-y-5">
          <CheckboxField
            id="set-urgent_enabled"
            label={t('admin.settings.fields.urgent_enabled')}
            description={t('admin.settings.fields.urgent_enabledHint')}
            {...register('urgent_enabled')}
          />
          <div className="grid gap-5 sm:grid-cols-3">
            <IntField
              name="urgent_tier1_timeout_seconds"
              label={t('admin.settings.fields.urgent_tier1_timeout_seconds')}
              hint={hintFor('urgent_tier1_timeout_seconds')}
              register={register}
              errors={errors}
            />
            <IntField
              name="urgent_tier2_timeout_seconds"
              label={t('admin.settings.fields.urgent_tier2_timeout_seconds')}
              hint={hintFor('urgent_tier2_timeout_seconds')}
              register={register}
              errors={errors}
            />
            <IntField
              name="urgent_tier3_timeout_seconds"
              label={t('admin.settings.fields.urgent_tier3_timeout_seconds')}
              hint={hintFor('urgent_tier3_timeout_seconds')}
              register={register}
              errors={errors}
            />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <IntField
              name="urgent_critical_timeout_seconds"
              label={t('admin.settings.fields.urgent_critical_timeout_seconds')}
              hint={hintFor('urgent_critical_timeout_seconds')}
              register={register}
              errors={errors}
            />
            <IntField
              name="urgent_directed_timeout_seconds"
              label={t('admin.settings.fields.urgent_directed_timeout_seconds')}
              hint={hintFor('urgent_directed_timeout_seconds')}
              register={register}
              errors={errors}
            />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <IntField
              name="urgent_requests_per_hour"
              label={t('admin.settings.fields.urgent_requests_per_hour')}
              hint={hintFor('urgent_requests_per_hour')}
              register={register}
              errors={errors}
            />
            <IntField
              name="urgent_location_retention_hours"
              label={t('admin.settings.fields.urgent_location_retention_hours')}
              hint={hintFor('urgent_location_retention_hours')}
              register={register}
              errors={errors}
            />
          </div>
        </div>
      </Section>

      <StickySaveBar
        form="admin-settings"
        dirty={isDirty}
        saving={isSubmitting}
        disabled={!isDirty}
        onDiscard={() => reset()}
      />
    </form>
  );
}
