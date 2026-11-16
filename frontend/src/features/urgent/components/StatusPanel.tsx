'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Check,
  CheckCircle2,
  CircleSlash,
  Clock,
  Info,
  Loader2,
  NotebookPen,
  Phone,
  SearchX,
  Users,
} from 'lucide-react';
import { DoctorAvatar, doctorAvatarPath } from '@/components/shared/MediaFallback';
import { buttonVariants } from '@/components/ui/button';
import { URGENT_KEYS } from '../hooks/keys';
import { urgentApi } from '../api';
import { useFormat, useT } from '@/i18n/provider';
import { cn } from '@/lib/utils';
import type { UrgentRequest } from '../types';
import { isMatching } from '../status';
import { StatusTimeline } from './StatusTimeline';

type Tone = 'primary' | 'success' | 'muted';
const PANEL: Record<Tone, string> = {
  primary: 'border-teal-200 bg-teal-50/60',
  success: 'border-emerald-200 bg-emerald-50/60',
  muted: 'border-border bg-muted/50',
};
const ICON: Record<Tone, string> = {
  primary: 'bg-teal-100 text-teal-800',
  success: 'bg-emerald-100 text-emerald-800',
  muted: 'bg-slate-200 text-slate-700',
};

function Panel({
  tone,
  icon,
  title,
  body,
  children,
}: {
  tone: Tone;
  icon: ReactNode;
  title: string;
  body?: string;
  children?: ReactNode;
}) {
  return (
    <section
      className={cn('space-y-5 rounded-2xl border p-5 sm:p-6', PANEL[tone])}
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'flex size-11 shrink-0 items-center justify-center rounded-full [&_svg]:size-6',
            ICON[tone],
          )}
        >
          {icon}
        </span>
        <div className="min-w-0 space-y-1">
          <h2 className="text-lg font-semibold" data-testid="urgent-status-title">
            {title}
          </h2>
          {body && <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

/** Headline card for the request's current status, with the live timeline while it is active. */
export function StatusPanel({ request: r }: { request: UrgentRequest }) {
  const t = useT();

  if (isMatching(r.status)) {
    const directed = r.preferred_doctor && (r.current_tier ?? 0) < 1 ? r.preferred_doctor : null;
    return (
      <Panel
        tone="primary"
        icon={<Loader2 className="animate-spin" aria-hidden />}
        title={
          directed
            ? t('urgent.live.directedTitle', { name: directed.name })
            : t('urgent.live.searchingTitle')
        }
        body={directed ? t('urgent.live.directedBody') : t('urgent.live.searchingBody')}
      >
        <AvailableNowCount />
        <StatusTimeline request={r} />
        {r.gp_disclosure && (
          <p className="flex gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
            {t('urgent.live.gpDisclosure')}
          </p>
        )}
      </Panel>
    );
  }

  if (r.status === 'accepted' || r.status === 'in_progress' || r.status === 'completed') {
    const completed = r.status === 'completed';
    const title = completed
      ? 'urgent.live.completedTitle'
      : r.status === 'accepted'
        ? 'urgent.live.acceptedTitle'
        : 'urgent.live.inProgressTitle';
    const body = completed
      ? 'urgent.live.completedBody'
      : r.status === 'accepted'
        ? 'urgent.live.acceptedBody'
        : 'urgent.live.inProgressBody';
    return (
      <Panel
        tone="success"
        icon={completed ? <Check aria-hidden /> : <CheckCircle2 aria-hidden />}
        title={t(title)}
        body={t(body)}
      >
        <DoctorContact request={r} showPhone={!completed} />
        {completed && r.outcome_note && (
          <div
            className="space-y-1 rounded-xl border border-emerald-200 bg-white p-4"
            data-testid="outcome-note"
          >
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <NotebookPen className="size-4 text-primary" aria-hidden />
              {t('urgent.live.outcomeNote')}
            </h3>
            <p className="text-sm whitespace-pre-line">{r.outcome_note}</p>
          </div>
        )}
        <StatusTimeline request={r} />
      </Panel>
    );
  }

  const unmatched = r.status === 'unmatched';
  const cancelled = r.status === 'cancelled';
  return (
    <Panel
      tone="muted"
      icon={
        unmatched ? (
          <SearchX aria-hidden />
        ) : cancelled ? (
          <CircleSlash aria-hidden />
        ) : (
          <Clock aria-hidden />
        )
      }
      title={t(
        unmatched
          ? 'urgent.live.unmatchedTitle'
          : cancelled
            ? 'urgent.live.cancelledTitle'
            : 'urgent.live.expiredTitle',
      )}
      body={t(
        unmatched
          ? 'urgent.live.unmatchedBody'
          : cancelled
            ? 'urgent.live.cancelledBody'
            : 'urgent.live.expiredBody',
      )}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/urgent" className={buttonVariants({ size: 'lg', className: 'w-full' })}>
          {t('urgent.live.newRequest')}
        </Link>
        <Link
          href="/search"
          className={buttonVariants({
            size: 'lg',
            variant: 'outline',
            className: 'w-full bg-white',
          })}
        >
          {t('urgent.live.bookRegular')}
        </Link>
      </div>
    </Panel>
  );
}

/** Real number of doctors available right now (no promises about response times). */
function AvailableNowCount() {
  const t = useT();
  const f = useFormat();
  const query = useQuery({
    queryKey: URGENT_KEYS.available(),
    queryFn: () => urgentApi.availableDoctors(),
    refetchInterval: 15_000,
  });
  if (!query.data) return null;
  return (
    <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm text-foreground ring-1 ring-teal-100">
      <Users className="size-4 text-primary" aria-hidden />
      {t('urgent.available.count', { count: f.number(query.data.count) })}
    </p>
  );
}

function DoctorContact({ request: r, showPhone }: { request: UrgentRequest; showPhone: boolean }) {
  const t = useT();
  const f = useFormat();
  const d = r.accepted_doctor;
  if (!d) return null;
  const title = f.l(d, 'title');

  return (
    <div
      className="space-y-4 rounded-xl border border-emerald-200 bg-white p-4"
      data-testid="accepted-doctor"
    >
      <div className="flex items-center gap-3">
        <DoctorAvatar name={d.name} url={doctorAvatarPath(d.id)} className="size-12 text-base" />
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{t('urgent.live.doctor')}</p>
          <p className="truncate font-semibold">{d.name}</p>
          {title && <p className="truncate text-sm text-muted-foreground">{title}</p>}
        </div>
      </div>
      {showPhone && d.phone && (
        <a
          href={`tel:${d.phone}`}
          className={buttonVariants({ variant: 'success', size: 'lg', className: 'w-full' })}
        >
          <Phone aria-hidden />
          {t('urgent.live.callDoctor')}
          <span dir="ltr" className="font-normal opacity-90">
            {d.phone}
          </span>
        </a>
      )}
    </div>
  );
}
