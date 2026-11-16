'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Power } from 'lucide-react';
import { toast } from 'sonner';
import type { AvailabilityPayload, VolunteerMode, VolunteerProfile } from '../../types';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { WindowsList, useModeLabel } from './WindowsList';
import { AvailabilityTiles } from './AvailabilityTiles';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Field, NativeSelect } from '@/components/ui/form';
import { URGENT_KEYS } from '../../hooks/keys';
import { volunteerApi } from '../../api';
import { isApiError } from '@/lib/api/client';
import { errorMessage } from '@/lib/api/errors';
import { useFormat, useT } from '@/i18n/provider';
import { ME_QUERY_KEY } from '@/lib/auth/AuthProvider';

const MODES: VolunteerMode[] = ['both', 'online', 'in_person'];

function defaultMode(p: VolunteerProfile): VolunteerMode {
  return p.accepts_online && p.accepts_in_person
    ? 'both'
    : p.accepts_in_person
      ? 'in_person'
      : 'online';
}

/** "Available now for N hours", "tonight", a scheduled window, current windows and "go unavailable". */
export function AvailabilityCard({ profile }: { profile: VolunteerProfile }) {
  const t = useT();
  const f = useFormat();
  const modeLabel = useModeLabel();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<VolunteerMode>(defaultMode(profile));
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [confirmOff, setConfirmOff] = useState(false);

  const onDone = ({ data, message }: { data: VolunteerProfile; message: string }) => {
    queryClient.setQueryData(URGENT_KEYS.volunteer, data);
    queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });
    toast.success(message || t('doctorUrgent.volunteer.availabilityUpdated'));
  };
  const add = useMutation({
    mutationFn: (body: AvailabilityPayload) => volunteerApi.addAvailability(body),
    onSuccess: onDone,
    onError: (e) => {
      setScheduleError(
        isApiError(e) ? (e.fieldError('ends_at') ?? e.fieldError('starts_at') ?? null) : null,
      );
      toast.error(errorMessage(e, t));
    },
  });
  const clear = useMutation({
    mutationFn: volunteerApi.clearAvailability,
    onSuccess: (r) => {
      onDone(r);
      setConfirmOff(false);
    },
    onError: (e) => toast.error(errorMessage(e, t)),
  });
  const busy = add.isPending || clear.isPending;
  const allowed = (m: VolunteerMode) =>
    m === 'both'
      ? profile.accepts_online && profile.accepts_in_person
      : m === 'online'
        ? profile.accepts_online
        : profile.accepts_in_person;

  if (!profile.opted_in) {
    return (
      <Card className="gap-3 px-5" data-testid="volunteer-availability-card">
        <h2 className="text-base font-semibold">{t('doctorUrgent.volunteer.availabilityTitle')}</h2>
        <p className="rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
          {t('doctorUrgent.volunteer.mustOptIn')}
        </p>
      </Card>
    );
  }

  return (
    <Card className="gap-0 py-0" data-testid="volunteer-availability-card">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b px-5 py-4">
        <div>
          <h2 className="text-base font-semibold">
            {t('doctorUrgent.volunteer.availabilityTitle')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t('doctorUrgent.volunteer.availabilityHint')}
          </p>
        </div>
        <Field
          label={t('doctorUrgent.volunteer.mode')}
          htmlFor="avail-mode"
          className="w-full gap-1 sm:w-56"
        >
          <NativeSelect
            id="avail-mode"
            value={mode}
            onChange={(e) => setMode(e.target.value as VolunteerMode)}
          >
            {MODES.map((m) => (
              <option key={m} value={m} disabled={!allowed(m)}>
                {modeLabel(m)}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <CardContent className="space-y-6 p-5">
        <AvailabilityTiles
          mode={mode}
          busy={busy}
          error={scheduleError}
          onAdd={(body) => {
            setScheduleError(null);
            add.mutate(body);
          }}
        />

        <WindowsList windows={profile.windows} />

        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <p className="text-xs text-muted-foreground">
            {profile.last_availability_update_at &&
              t('doctorUrgent.volunteer.lastUpdate', {
                when: f.dateTime(profile.last_availability_update_at),
              })}
          </p>
          <Button
            variant="danger"
            disabled={busy || profile.windows.length === 0}
            onClick={() => setConfirmOff(true)}
          >
            <Power aria-hidden />
            {t('doctorUrgent.volunteer.goUnavailable')}
          </Button>
        </div>
      </CardContent>
      <ConfirmDialog
        open={confirmOff}
        onOpenChange={setConfirmOff}
        title={t('doctorUrgent.volunteer.goUnavailableTitle')}
        description={t('doctorUrgent.volunteer.goUnavailableBody')}
        confirmLabel={t('doctorUrgent.volunteer.goUnavailable')}
        destructive
        pending={clear.isPending}
        onConfirm={() => clear.mutate()}
      />
    </Card>
  );
}
