'use client';

import { Check } from 'lucide-react';
import { useFormat, useT } from '@/i18n/provider';
import type { TFunction } from '@/i18n/translate';
import { cn } from '@/lib/utils';
import type { UrgentRequest } from '../types';
import { isMatching } from '../status';
import { useElapsedFormat, useNow } from '@/lib/time';

type StepState = 'done' | 'current' | 'pending';
interface Step {
  key: string;
  label: string;
  detail?: string | null;
  state: StepState;
}

const TIER_KEYS = ['urgent.live.tier1', 'urgent.live.tier2', 'urgent.live.tier3'] as const;

function tierLabel(r: UrgentRequest, t: TFunction): string | null {
  const tier = r.current_tier ?? 0;
  if (r.severity === 'critical' || tier < 1) return null;
  if (tier === 2 && r.consultation_type === 'online') return t('urgent.live.tier2Online');
  return t(TIER_KEYS[Math.min(tier, 3) - 1]);
}

/** Directed → (fallback) broadcast → accepted → in progress → completed, from the real request state. */
function buildSteps(
  r: UrgentRequest,
  t: TFunction,
  waiting: string | null,
  acceptedAfter: string | null,
): Step[] {
  const matching = isMatching(r.status);
  const directed = r.preferred_doctor;
  const fellBack = (r.current_tier ?? 0) >= 1;
  const waitingDetail = waiting ? t('urgent.live.waiting', { time: waiting }) : null;
  const steps: Step[] = [{ key: 'sent', label: t('urgent.live.stepSent'), state: 'done' }];

  if (directed) {
    steps.push({
      key: 'directed',
      label: t('urgent.live.stepDirected', { name: directed.name }),
      detail: matching && !fellBack ? waitingDetail : null,
      state: matching && !fellBack ? 'current' : 'done',
    });
  }
  if (!directed || fellBack || matching) {
    const label = directed
      ? t('urgent.live.stepFallback')
      : r.severity === 'critical'
        ? t('urgent.live.stepCritical')
        : t('urgent.live.stepNotifying');
    const active = matching && (!directed || fellBack);
    steps.push({
      key: 'search',
      label,
      detail: active ? [tierLabel(r, t), waitingDetail].filter(Boolean).join(' · ') : null,
      state: active ? 'current' : matching ? 'pending' : 'done',
    });
  }
  steps.push({
    key: 'accepted',
    label: t('urgent.live.stepAccepted'),
    detail: acceptedAfter ? t('urgent.live.acceptedAfter', { time: acceptedAfter }) : null,
    state: matching ? 'pending' : r.status === 'accepted' ? 'current' : 'done',
  });
  steps.push({
    key: 'started',
    label: t('urgent.live.stepInProgress'),
    state: r.status === 'in_progress' ? 'current' : r.status === 'completed' ? 'done' : 'pending',
  });
  steps.push({
    key: 'completed',
    label: t('urgent.live.stepCompleted'),
    state: r.status === 'completed' ? 'done' : 'pending',
  });
  return steps;
}

export function StatusTimeline({ request: r }: { request: UrgentRequest }) {
  const t = useT();
  const f = useFormat();
  const duration = useElapsedFormat();
  const now = useNow(1_000);
  const created = r.created_at ? Date.parse(r.created_at) : null;
  const waiting = isMatching(r.status) && created ? duration((now - created) / 1000) : null;
  const acceptedAfter =
    r.time_to_accept_seconds != null ? duration(r.time_to_accept_seconds) : null;
  const steps = buildSteps(r, t, waiting, acceptedAfter);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">{t('urgent.live.timelineTitle')}</h3>
      <ol className="space-y-0" data-testid="urgent-timeline">
        {steps.map((s, i) => (
          <li
            key={s.key}
            aria-current={s.state === 'current' ? 'step' : undefined}
            className="relative flex gap-3 pb-4 last:pb-0"
          >
            {i < steps.length - 1 && (
              <span
                aria-hidden
                className={cn(
                  'absolute start-3 top-7 bottom-0 w-px -translate-x-1/2 rtl:translate-x-1/2',
                  s.state === 'done' ? 'bg-primary/40' : 'bg-border',
                )}
              />
            )}
            <span
              className={cn(
                'relative flex size-6 shrink-0 items-center justify-center rounded-full text-xs',
                s.state === 'done' && 'bg-primary text-primary-foreground',
                s.state === 'current' && 'bg-white ring-2 ring-primary',
                s.state === 'pending' && 'bg-white ring-1 ring-border',
              )}
            >
              {s.state === 'done' && <Check className="size-3.5" aria-hidden />}
              {s.state === 'current' && (
                <span className="size-2.5 animate-pulse rounded-full bg-primary" />
              )}
            </span>
            <div className="min-w-0 pt-0.5">
              <p
                className={cn(
                  'text-sm',
                  s.state === 'pending' ? 'text-muted-foreground' : 'font-medium',
                )}
              >
                {s.label}
                {s.key === 'sent' && r.created_at && (
                  <span className="ms-2 font-normal text-muted-foreground">
                    {f.time(r.created_at)}
                  </span>
                )}
              </p>
              {s.detail && (
                <p
                  className="text-xs text-muted-foreground tabular-nums"
                  data-testid={`step-${s.key}-detail`}
                >
                  {s.detail}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
