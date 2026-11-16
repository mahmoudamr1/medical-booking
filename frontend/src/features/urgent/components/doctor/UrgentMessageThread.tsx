'use client';

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Loader2, MessagesSquare, SendHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { ErrorState, Skeleton } from '@/components/shared/states';
import { useUrgentMessages, type ThreadMessage } from '../../hooks/useUrgentMessages';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/form';
import { errorMessage } from '@/lib/api/errors';
import { useFormat, useT } from '@/i18n/provider';
import { cn } from '@/lib/utils';

const MAX = 1000;

function Bubble({ m }: { m: ThreadMessage }) {
  const t = useT();
  const f = useFormat();
  return (
    <li
      className={cn('flex', m.mine ? 'justify-end' : 'justify-start')}
      data-testid="urgent-message"
      data-mine={m.mine ? 'true' : 'false'}
    >
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-3.5 py-2 text-sm shadow-sm',
          m.mine
            ? 'rounded-ee-sm bg-primary text-primary-foreground'
            : 'rounded-es-sm bg-muted text-foreground',
          m.pending && 'opacity-70',
        )}
      >
        <p className="break-words whitespace-pre-wrap" dir="auto">
          {m.body}
        </p>
        <p
          className={cn(
            'mt-1 text-[11px]',
            m.mine ? 'text-primary-foreground/80' : 'text-muted-foreground',
          )}
        >
          {m.pending
            ? t('doctorUrgent.requests.messages.sending')
            : `${m.mine ? t('doctorUrgent.requests.messages.you') : t('doctorUrgent.requests.patient')} · ${f.time(m.created_at)}`}
        </p>
      </div>
    </li>
  );
}

/** Patient ↔ accepted-doctor thread (polled every 4 s while open). Read-only once the request is closed. */
export function UrgentMessageThread({
  requestId,
  canSend,
  open,
}: {
  requestId: string;
  canSend: boolean;
  open: boolean;
}) {
  const t = useT();
  const f = useFormat();
  const [text, setText] = useState('');
  const listRef = useRef<HTMLUListElement>(null);
  const { query, send } = useUrgentMessages(requestId, open && canSend);
  const messages = query.data ?? [];

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const body = text.trim();
    if (!body || send.isPending) return;
    setText('');
    send.mutate(body, {
      onError: (err) => {
        setText(body);
        toast.error(errorMessage(err, t));
      },
    });
  };
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) submit();
  };

  return (
    <section
      className="space-y-3 rounded-xl border p-3"
      aria-label={t('doctorUrgent.requests.messages.title')}
      data-testid="urgent-thread"
    >
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <MessagesSquare className="size-4 text-primary" aria-hidden />
        {t('doctorUrgent.requests.messages.title')}
      </h3>
      {query.isPending ? (
        <Skeleton className="h-24 w-full rounded-lg" />
      ) : query.isError && messages.length === 0 ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : (
        <ul
          ref={listRef}
          className="max-h-72 min-h-24 space-y-2 overflow-y-auto overscroll-contain rounded-lg bg-muted/30 p-2"
          aria-live="polite"
        >
          {messages.length === 0 ? (
            <li className="py-6 text-center text-sm text-muted-foreground">
              {t('doctorUrgent.requests.messages.empty')}
            </li>
          ) : (
            messages.map((m) => <Bubble key={m.id} m={m} />)
          )}
        </ul>
      )}
      {canSend ? (
        <form onSubmit={submit} className="flex items-end gap-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            maxLength={MAX}
            rows={2}
            dir="auto"
            placeholder={t('doctorUrgent.requests.messages.placeholder')}
            aria-label={t('doctorUrgent.requests.messages.placeholder')}
            className="min-h-11 flex-1 resize-none"
            data-testid="urgent-message-input"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!text.trim() || send.isPending}
            aria-label={t('doctorUrgent.requests.messages.send')}
            data-testid="urgent-message-send"
          >
            {send.isPending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <SendHorizontal className="rtl:-scale-x-100" />
            )}
          </Button>
        </form>
      ) : (
        <p className="text-xs text-muted-foreground">
          {t('doctorUrgent.requests.messages.closed')}
        </p>
      )}
      {canSend && text.length > MAX * 0.8 && (
        <p className="text-end text-xs text-muted-foreground tabular-nums">
          {f.number(text.length)} / {f.number(MAX)}
        </p>
      )}
    </section>
  );
}
