'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, SearchX } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { RequireAuth } from '@/features/auth';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState, LoadingState } from '@/components/shared/states';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MessageThread } from './MessageThread';
import { StatusPanel } from './StatusPanel';
import { SeverityBadge, UrgentStatusBadge } from './badges';
import { UrgentDetails } from './UrgentDetails';
import { canMessage, canPatientCancel, isTerminal } from '../status';
import { URGENT_KEYS } from '../hooks/keys';
import { urgentApi } from '../api';
import { isApiError } from '@/lib/api/client';
import { errorMessage } from '@/lib/api/errors';
import { useFormat, useT } from '@/i18n/provider';
import { cn } from '@/lib/utils';

const POLL_MS = 5000;

export function RequestStatusScreen() {
  return (
    <MainLayout>
      <RequireAuth>
        <UrgentStatusView />
      </RequireAuth>
    </MainLayout>
  );
}

function UrgentStatusView() {
  const t = useT();
  const f = useFormat();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: URGENT_KEYS.request(id),
    queryFn: () => urgentApi.show(id),
    refetchInterval: (q) => (q.state.data && isTerminal(q.state.data.status) ? false : POLL_MS),
    retry: (count, e) => !(isApiError(e) && (e.status === 404 || e.status === 403)) && count < 2,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: URGENT_KEYS.request(id) });

  const cancel = useMutation({
    mutationFn: (reason: string) => urgentApi.cancel(id, reason || undefined),
    onSuccess: ({ data }) => {
      queryClient.setQueryData(URGENT_KEYS.request(id), data);
      queryClient.invalidateQueries({ queryKey: URGENT_KEYS.patientAll });
      toast.success(t('urgent.live.cancelDone'));
      setCancelOpen(false);
    },
    onError: (e) => {
      setCancelError(errorMessage(e, t));
      void refresh();
    },
  });

  const back = (
    <Link
      href="/urgent/history"
      className={buttonVariants({ variant: 'ghost', size: 'sm', className: '-ms-2' })}
    >
      <ArrowLeft className="rtl:rotate-180" aria-hidden />
      {t('urgent.live.back')}
    </Link>
  );

  if (query.isPending) {
    return (
      <div className="container-page max-w-3xl py-8">
        <LoadingState className="py-24" />
      </div>
    );
  }
  if (query.isError) {
    const notFound =
      isApiError(query.error) && (query.error.status === 404 || query.error.status === 403);
    return (
      <div className="container-page max-w-3xl space-y-4 py-8">
        {back}
        {notFound ? (
          <EmptyState icon={SearchX} title={t('urgent.live.notFound')} />
        ) : (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        )}
      </div>
    );
  }

  const r = query.data;
  const live = !isTerminal(r.status);
  return (
    <div className="container-page max-w-3xl space-y-5 py-6 sm:py-8">
      {back}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold sm:text-3xl">{t('urgent.title')}</h1>
          {r.created_at && (
            <p className="text-sm text-muted-foreground">
              {t('urgent.live.requestedAt', { time: f.dateTime(r.created_at) })}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {r.severity && <SeverityBadge severity={r.severity} />}
          <UrgentStatusBadge status={r.status} />
        </div>
      </header>

      <StatusPanel request={r} />

      {live && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className={cn('size-3.5', query.isFetching && 'animate-spin')} aria-hidden />
          {t('urgent.live.pollingHint')}
        </p>
      )}

      {r.accepted_doctor && (canMessage(r.status) || r.status === 'completed') && (
        <MessageThread requestId={r.id} live={canMessage(r.status)} onConflict={refresh} />
      )}

      <Card>
        <CardContent className="space-y-2">
          <h2 className="text-lg font-semibold">{t('urgent.details.title')}</h2>
          <UrgentDetails request={r} />
        </CardContent>
      </Card>

      {canPatientCancel(r.status) && (
        <Button
          variant="outline"
          size="lg"
          className="w-full sm:w-auto"
          onClick={() => {
            setCancelError(null);
            setCancelOpen(true);
          }}
        >
          {t('urgent.live.cancel')}
        </Button>
      )}

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title={t('urgent.live.cancelTitle')}
        description={t('urgent.live.cancelBody')}
        confirmLabel={t('urgent.live.cancelConfirm')}
        destructive
        pending={cancel.isPending}
        error={cancelError}
        reason={{ label: t('urgent.live.cancelReason') }}
        onConfirm={(reason) => cancel.mutate(reason.slice(0, 200))}
      />
    </div>
  );
}
