'use client';

import Link from 'next/link';
import { LogIn, Radio, UserRound } from 'lucide-react';
import { LoadingState } from '@/components/shared/states';
import { buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useT } from '@/i18n/provider';
import type { UrgentDoctorRef } from '../types';
import { OpenRequestNotice, useOpenUrgentRequest } from './OpenRequestNotice';
import { UrgentRequestForm } from './UrgentRequestForm';

/** Query value that reopens the dialog after sign-in: a doctor id, or "all" for a broadcast. */
export const BROADCAST = 'all';

/**
 * Request sheet: sign-in gate (returning here afterwards), open-request guard, then the form.
 * `doctor` = directed request; `null` = broadcast to everyone available.
 */
export function RequestDialog({
  open,
  onOpenChange,
  doctor,
  onDoctorChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doctor: UrgentDoctorRef | null;
  onDoctorChange: (doctor: UrgentDoctorRef | null) => void;
}) {
  const t = useT();
  const { user, isLoading } = useAuth();
  const existing = useOpenUrgentRequest(open && !!user);
  const returnTo = `/urgent?request=${encodeURIComponent(doctor?.id ?? BROADCAST)}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5 sm:max-w-2xl">
        <DialogHeader className="pe-8">
          <DialogTitle className="text-xl font-semibold">
            {doctor
              ? t('urgent.request.titleDirected', { name: doctor.name })
              : t('urgent.request.titleBroadcast')}
          </DialogTitle>
          <DialogDescription className="flex items-start gap-2 rounded-lg bg-accent/60 px-3 py-2 text-sm text-foreground">
            {doctor ? (
              <UserRound className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            ) : (
              <Radio className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            )}
            {doctor
              ? t('urgent.request.directedNote', { name: doctor.name })
              : t('urgent.request.broadcastNote')}
          </DialogDescription>
        </DialogHeader>

        {isLoading || (user && existing.isPending) ? (
          <LoadingState />
        ) : !user ? (
          <div className="space-y-4 rounded-xl border bg-muted/40 p-5 text-center">
            <LogIn className="mx-auto size-8 text-primary" aria-hidden />
            <div className="space-y-1">
              <h3 className="font-semibold">{t('urgent.request.signInTitle')}</h3>
              <p className="text-sm text-muted-foreground">{t('urgent.request.signInBody')}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Link
                href={`/auth/login?next=${encodeURIComponent(returnTo)}`}
                className={buttonVariants({ size: 'lg', className: 'w-full' })}
              >
                {t('urgent.request.signIn')}
              </Link>
              <Link
                href="/auth/register"
                className={buttonVariants({ size: 'lg', variant: 'outline', className: 'w-full' })}
              >
                {t('urgent.request.register')}
              </Link>
            </div>
          </div>
        ) : existing.open ? (
          <OpenRequestNotice message={t('urgent.request.openExists')} />
        ) : (
          <UrgentRequestForm
            preferredDoctor={doctor}
            defaultPhone={user.phone}
            onBroadcastInstead={() => onDoctorChange(null)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
