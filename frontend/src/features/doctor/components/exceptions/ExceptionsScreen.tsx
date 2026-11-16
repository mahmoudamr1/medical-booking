'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CalendarRange, MapPin, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { ScheduleException } from '../../types';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ErrorState, LoadingState } from '@/components/shared/states';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageHeader } from '@/components/shared/PageHeader';
import { useBranchLabel } from '../../hooks/useDoctorProfile';
import { ExceptionForm, useRefreshExceptions } from '../ExceptionForm';
import { doctorApi } from '../../api';
import { doctorKeys } from '../../hooks/keys';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { errorMessage } from '@/lib/api/errors';
import { useFormat, useT } from '@/i18n/provider';
import { cn } from '@/lib/utils';

export function ExceptionsScreen() {
  const t = useT();
  const f = useFormat();
  const refresh = useRefreshExceptions();
  const branchName = useBranchLabel();
  const exceptions = useQuery({
    queryKey: doctorKeys.exceptions,
    queryFn: doctorApi.exceptions,
  });
  const [deleting, setDeleting] = useState<ScheduleException | null>(null);

  const remove = useMutation({
    mutationFn: (id: string) => doctorApi.deleteException(id),
    onSuccess: () => {
      toast.success(t('common.deleted'));
      setDeleting(null);
      refresh();
    },
    onError: (e) => toast.error(errorMessage(e, t)),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('doctorDash.exceptionsTitle')}
        description={t('doctorDash.exceptionsHint')}
      />

      <ExceptionForm />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t('doctorPanel.exceptions.upcoming')}</h2>
        {exceptions.isPending ? (
          <LoadingState rows={3} />
        ) : exceptions.isError ? (
          <ErrorState error={exceptions.error} onRetry={() => exceptions.refetch()} />
        ) : exceptions.data.length === 0 ? (
          <EmptyState
            icon={CalendarRange}
            title={t('doctorDash.noExceptions')}
            description={t('doctorPanel.exceptions.emptyHint')}
          />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {exceptions.data.map((e) => (
              <li
                key={e.id}
                className="flex items-start gap-3 rounded-xl border bg-card p-4"
                data-testid="exception-item"
              >
                <div
                  className={cn(
                    'flex size-12 shrink-0 flex-col items-center justify-center rounded-lg text-center leading-none',
                    e.type === 'closed' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800',
                  )}
                >
                  <span className="text-lg font-bold tabular-nums">
                    {f.dateKey(e.date, { day: 'numeric' })}
                  </span>
                  <span className="text-[11px]">{f.dateKey(e.date, { month: 'short' })}</span>
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="font-medium text-foreground">
                    {f.dateKey(e.date, {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    {e.type === 'closed' ? (
                      <Badge variant="danger">{t('doctorDash.exceptionClosed')}</Badge>
                    ) : (
                      <Badge variant="warning">
                        {t('doctorDash.exceptionCustom')}:{' '}
                        <span dir="ltr">
                          {e.starts_at}–{e.ends_at}
                        </span>
                      </Badge>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3.5" aria-hidden />
                      {branchName(e.clinic_branch_id)}
                    </span>
                  </div>
                  {e.reason && <p className="text-sm text-muted-foreground">{e.reason}</p>}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t('common.delete')}
                  onClick={() => setDeleting(e)}
                >
                  <Trash2 className="text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={t('doctorDash.deleteExceptionTitle')}
        description={deleting ? f.dateKey(deleting.date) : undefined}
        confirmLabel={t('common.yesDelete')}
        destructive
        pending={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      />
    </div>
  );
}
