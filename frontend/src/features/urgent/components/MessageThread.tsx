'use client';

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, MessageCircle, SendHorizontal } from 'lucide-react';
import { ErrorState } from '@/components/shared/states';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/form';
import { isApiError } from '@/lib/api/client';
import { URGENT_KEYS } from '../hooks/keys';
import { urgentApi } from '../api';
import { useFormat, useT } from '@/i18n/provider';
import { cn } from '@/lib/utils';
import type { UrgentMessage } from '../types';

const POLL_MS = 4000;
const MAX = 1000;

interface Pending {
  key: number;
  body: string;
  failed: boolean;
}

/** Appends new messages by id (polling with `after_id` and optimistic sends can overlap). */
function merge(prev: UrgentMessage[], next: UrgentMessage[]): UrgentMessage[] {
  const seen = new Set(prev.map((m) => m.id));
  const added = next.filter((m) => !seen.has(m.id));
  return added.length ? [...prev, ...added].sort((a, b) => a.id - b.id) : prev;
}

/**
 * Patient ↔ accepted-doctor thread. Polls for new messages while `live`; read-only once closed.
 * `onConflict` lets the page refresh the request when the API says it is no longer open.
 */
export function MessageThread({
  requestId,
  live,
  onConflict,
}: {
  requestId: string;
  live: boolean;
  onConflict: () => void;
}) {
  const t = useT();
  const queryClient = useQueryClient();
  const key = URGENT_KEYS.messages(requestId);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState<Pending[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const nextKey = useRef(0);

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      const prev = queryClient.getQueryData<UrgentMessage[]>(key) ?? [];
      const fresh = await urgentApi.messages(requestId, prev.at(-1)?.id);
      return merge(prev, fresh ?? []);
    },
    refetchInterval: live ? POLL_MS : false,
  });
  const messages = query.data ?? [];

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, pending.length]);

  const deliver = async (item: Pending) => {
    try {
      const { data } = await urgentApi.sendMessage(requestId, item.body);
      queryClient.setQueryData<UrgentMessage[]>(key, (prev) => merge(prev ?? [], [data]));
      setPending((p) => p.filter((x) => x.key !== item.key));
    } catch (e) {
      setPending((p) => p.map((x) => (x.key === item.key ? { ...x, failed: true } : x)));
      if (isApiError(e) && e.status === 409) onConflict();
    }
  };

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const body = draft.trim();
    if (!body || body.length > MAX) return;
    const item = { key: nextKey.current++, body, failed: false };
    setPending((p) => [...p, item]);
    setDraft('');
    void deliver(item);
  };
  const retry = (item: Pending) => {
    setPending((p) => p.map((x) => (x.key === item.key ? { ...x, failed: false } : x)));
    void deliver(item);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return;
    e.preventDefault();
    submit();
  };

  return (
    <section
      aria-labelledby="messages-title"
      className="overflow-hidden rounded-2xl border bg-card"
    >
      <h2 id="messages-title" className="flex items-center gap-2 border-b px-5 py-3 font-semibold">
        <MessageCircle className="size-5 text-primary" aria-hidden />
        {t('urgent.messages.title')}
      </h2>
      <div
        ref={listRef}
        className="max-h-[26rem] min-h-40 space-y-3 overflow-y-auto bg-muted/30 px-4 py-4"
        aria-live="polite"
        data-testid="message-list"
      >
        {query.isPending ? (
          <Loader2
            className="mx-auto mt-10 size-5 animate-spin text-muted-foreground"
            aria-label={t('common.loading')}
          />
        ) : query.isError && messages.length === 0 ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} className="py-6" />
        ) : messages.length === 0 && pending.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {t('urgent.messages.empty')}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {messages.map((m) => (
              <Bubble key={m.id} mine={m.mine} body={m.body} at={m.created_at} />
            ))}
            {pending.map((p) => (
              <Bubble
                key={`p${p.key}`}
                mine
                body={p.body}
                pending={!p.failed}
                failed={p.failed}
                onRetry={() => retry(p)}
              />
            ))}
          </ul>
        )}
      </div>
      {live ? (
        <form onSubmit={submit} className="flex items-end gap-2 border-t p-3">
          <Textarea
            aria-label={t('urgent.messages.label')}
            placeholder={t('urgent.messages.placeholder')}
            rows={1}
            maxLength={MAX}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            className="max-h-32 min-h-11 resize-none"
            data-testid="message-input"
          />
          <Button
            type="submit"
            size="icon-lg"
            disabled={!draft.trim()}
            aria-label={t('urgent.messages.send')}
          >
            <SendHorizontal className="rtl:-scale-x-100" aria-hidden />
          </Button>
        </form>
      ) : (
        <p className="border-t px-5 py-3 text-sm text-muted-foreground">
          {t('urgent.messages.closed')}
        </p>
      )}
    </section>
  );
}

function Bubble({
  mine,
  body,
  at,
  pending,
  failed,
  onRetry,
}: {
  mine: boolean;
  body: string;
  at?: string;
  pending?: boolean;
  failed?: boolean;
  onRetry?: () => void;
}) {
  const t = useT();
  const f = useFormat();
  return (
    <li
      className={cn(
        'flex max-w-[85%] flex-col gap-1 sm:max-w-[75%]',
        mine ? 'items-end self-end' : 'items-start self-start',
      )}
      data-testid="message"
      data-mine={mine}
    >
      <span className="text-xs text-muted-foreground">
        {mine ? t('urgent.messages.you') : t('urgent.messages.doctor')}
      </span>
      <p
        dir="auto"
        className={cn(
          'rounded-2xl px-4 py-2 text-sm leading-relaxed break-words whitespace-pre-line',
          mine
            ? 'rounded-se-sm bg-primary text-primary-foreground'
            : 'rounded-ss-sm border bg-card text-foreground',
          pending && 'opacity-70',
          failed && 'ring-2 ring-destructive/40',
        )}
      >
        {body}
      </p>
      {failed ? (
        <span className="flex items-center gap-2 text-xs text-destructive">
          {t('urgent.messages.failed')}
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto min-h-11 px-1"
            onClick={onRetry}
          >
            {t('urgent.messages.retry')}
          </Button>
        </span>
      ) : (
        at && (
          <time className="text-[11px] text-muted-foreground" dateTime={at}>
            {f.time(at)}
          </time>
        )
      )}
    </li>
  );
}
