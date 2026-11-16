'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  ArrowLeft,
  CircleSlash,
  History,
  Lock,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/states';
import { Button, buttonVariants } from '@/components/ui/button';
import { AvailableDoctors } from './AvailableDoctors';
import { useOpenUrgentRequest } from './OpenRequestNotice';
import { BROADCAST, RequestDialog } from './RequestDialog';
import { useUrgentSettings } from '../hooks/useUrgentSettings';
import { URGENT_KEYS } from '../hooks/keys';
import { urgentApi } from '../api';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useT } from '@/i18n/provider';
import type { UrgentDoctorRef } from '../types';

export function UrgentScreen() {
  return (
    <MainLayout>
      <Suspense fallback={<LoadingState className="py-24" />}>
        <UrgentHome />
      </Suspense>
    </MainLayout>
  );
}

function UrgentHome() {
  const t = useT();
  const settings = useUrgentSettings();
  const [dialog, setDialog] = useState<{ open: boolean; doctor: UrgentDoctorRef | null }>({
    open: false,
    doctor: null,
  });
  const request = useCallback(
    (doctor: UrgentDoctorRef | null) => setDialog({ open: true, doctor }),
    [],
  );
  useReturnAfterLogin(request);

  if (settings.isPending) return <LoadingState className="py-24" />;
  if (settings.data?.urgent_enabled === false) {
    return (
      <div className="container-page max-w-3xl py-10">
        <EmptyState
          icon={CircleSlash}
          tone="muted"
          title={t('urgent.hero.disabledTitle')}
          description={t('urgent.hero.disabledBody')}
          action={
            <Link href="/search" className={buttonVariants({ size: 'lg' })}>
              {t('urgent.available.bookRegular')}
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="container-page max-w-6xl space-y-10 py-6 sm:py-10">
      <Hero onRequestFirst={() => request(null)} />
      <AvailableDoctors onRequest={request} />
      <RequestDialog
        open={dialog.open}
        doctor={dialog.doctor}
        onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
        onDoctorChange={(doctor) => setDialog((d) => ({ ...d, doctor }))}
      />
    </div>
  );
}

/** Reopens the request dialog after sign-in (`?request=<doctorId|all>`), then cleans the URL. */
function useReturnAfterLogin(request: (doctor: UrgentDoctorRef | null) => void) {
  const router = useRouter();
  const param = useSearchParams().get('request');
  const { user } = useAuth();
  const directedId = param && param !== BROADCAST ? param : null;
  const available = useQuery({
    queryKey: URGENT_KEYS.available(),
    queryFn: () => urgentApi.availableDoctors(),
    enabled: !!user && !!directedId,
  });

  const handled = useRef(false);

  useEffect(() => {
    if (handled.current || !param || !user || (directedId && available.isPending)) return;
    handled.current = true;
    const doctor = available.data?.doctors.find((d) => d.id === directedId);
    // A doctor who is no longer available falls back to a broadcast request.
    request(doctor ? { id: doctor.id, name: doctor.name } : null);
    router.replace('/urgent', { scroll: false });
  }, [param, user, directedId, available.isPending, available.data, request, router]);
}

function Hero({ onRequestFirst }: { onRequestFirst: () => void }) {
  const t = useT();
  const { user } = useAuth();
  const { open } = useOpenUrgentRequest(!!user);
  const trust = [
    { icon: ShieldCheck, text: t('urgent.hero.trustVerified') },
    { icon: Lock, text: t('urgent.hero.trustPrivate') },
    { icon: Activity, text: t('urgent.hero.trustLive') },
  ];

  return (
    <section className="relative overflow-hidden rounded-3xl border border-teal-100 bg-linear-to-br from-teal-50 via-white to-sky-50 p-6 sm:p-10">
      <div className="max-w-3xl space-y-5">
        <p className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-sm font-medium text-primary ring-1 ring-teal-100">
          <Stethoscope className="size-4" aria-hidden />
          {t('urgent.title')}
        </p>
        <h1 className="text-2xl leading-tight font-bold text-balance sm:text-4xl">
          {t('urgent.hero.title')}
        </h1>
        <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
          {t('urgent.hero.body')}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button
            size="lg"
            className="h-12 px-6 text-base sm:h-12"
            onClick={onRequestFirst}
            data-testid="request-first"
          >
            {t('urgent.hero.requestFirst')}
            <ArrowLeft className="ltr:rotate-180" aria-hidden />
          </Button>
          {user && (
            <Link
              href="/urgent/history"
              className={buttonVariants({
                size: 'lg',
                variant: 'outline',
                className: 'h-12 bg-white sm:h-12',
              })}
            >
              <History aria-hidden />
              {t('urgent.hero.myRequests')}
            </Link>
          )}
        </div>
        {open && (
          <p
            role="status"
            className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          >
            {t('urgent.hero.openBanner')}
            <Link
              href={`/urgent/${open.id}`}
              className="inline-flex min-h-11 items-center font-semibold underline underline-offset-2"
            >
              {t('urgent.hero.openBannerLink')}
            </Link>
          </p>
        )}
        <ul className="grid gap-2 pt-1 text-sm text-foreground sm:grid-cols-3">
          {trust.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-2">
              <Icon className="size-4 shrink-0 text-primary" aria-hidden />
              {text}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
