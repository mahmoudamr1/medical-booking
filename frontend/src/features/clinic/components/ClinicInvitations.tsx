'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import type { ClinicInvitation } from '../types';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ErrorState, Section } from '@/components/shared/states';
import { Button } from '@/components/ui/button';
import { clinicApi } from '../api';
import { clinicKeys } from '../hooks/keys';
import { errorMessage } from '@/lib/api/errors';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useFormat, useT } from '@/i18n/provider';
import { cn } from '@/lib/utils';
import { roleKey } from './ClinicSwitcher';

/**
 * Pending clinic invitations for the signed-in user (GET /my/invitations) with accept/decline.
 * Renders nothing for guests, while loading, or when there are no invitations.
 */
export function ClinicInvitations({ className }: { className?: string }) {
  const t = useT();
  const f = useFormat();
  const { user, refresh } = useAuth();
  const queryClient = useQueryClient();
  const [declining, setDeclining] = useState<ClinicInvitation | null>(null);
  const [declineError, setDeclineError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: clinicKeys.invitations,
    queryFn: clinicApi.invitations,
    enabled: !!user,
  });

  const respond = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: 'accept' | 'decline' }) =>
      clinicApi.respondInvitation(id, decision),
    onSuccess: async ({ message }, { decision }) => {
      toast.success(
        message ||
          t(decision === 'accept' ? 'clinic.invitations.accepted' : 'clinic.invitations.declined'),
      );
      setDeclining(null);
      queryClient.invalidateQueries({ queryKey: clinicKeys.invitations });
      queryClient.invalidateQueries({ queryKey: clinicKeys.mine });
      // The accepted clinic shows up in /auth/me → user.clinics (dashboard links, switcher).
      if (decision === 'accept') await refresh();
    },
    onError: (e, { decision }) => {
      if (decision === 'decline') setDeclineError(errorMessage(e, t));
      else toast.error(errorMessage(e, t));
    },
  });

  if (!user || query.isPending) return null;
  if (query.isError) {
    return (
      <ErrorState
        className={cn('py-6', className)}
        error={query.error}
        onRetry={() => query.refetch()}
        title={t('clinic.invitations.title')}
      />
    );
  }
  if (query.data.length === 0) return null;

  const busyId = respond.isPending ? respond.variables?.id : null;

  return (
    <Section
      className={className}
      title={t('clinic.invitations.title')}
      description={t('clinic.invitations.description')}
    >
      <ul className="divide-y">
        {query.data.map((inv) => (
          <li
            key={inv.id}
            className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
                <Building2 className="size-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <Link
                  href={`/clinics/${inv.clinic.slug}`}
                  className="block truncate font-medium text-foreground hover:text-primary"
                >
                  {f.l(inv.clinic)}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {t('clinic.invitations.asRole', { role: t(roleKey(inv.role)) })}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="success"
                disabled={busyId === inv.id}
                onClick={() => respond.mutate({ id: inv.id, decision: 'accept' })}
              >
                <Check aria-hidden />
                {t('clinic.invitations.accept')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busyId === inv.id}
                onClick={() => {
                  setDeclineError(null);
                  setDeclining(inv);
                }}
              >
                <X aria-hidden />
                {t('clinic.invitations.decline')}
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={!!declining}
        onOpenChange={(o) => !o && setDeclining(null)}
        title={t('clinic.invitations.declineTitle')}
        description={
          declining
            ? t('clinic.invitations.declineBody', { clinic: f.l(declining.clinic) })
            : undefined
        }
        confirmLabel={t('clinic.invitations.decline')}
        destructive
        pending={respond.isPending}
        error={declineError}
        onConfirm={() => declining && respond.mutate({ id: declining.id, decision: 'decline' })}
      />
    </Section>
  );
}
