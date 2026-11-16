'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UrgentMessage } from '../types';
import { URGENT_KEYS } from './keys';
import { urgentApi } from '../api';

const POLL_MS = 4_000;

/** A message in the thread; optimistic ones have a negative id until the server confirms them. */
export type ThreadMessage = UrgentMessage & { pending?: boolean };

function merge(current: ThreadMessage[], incoming: ThreadMessage[]): ThreadMessage[] {
  const byId = new Map(current.map((m) => [m.id, m]));
  for (const m of incoming) byId.set(m.id, m);
  return [...byId.values()].sort(
    (a, b) => (a.id < 0 ? Infinity : a.id) - (b.id < 0 ? Infinity : b.id),
  );
}

/**
 * Message thread for an accepted urgent request: loads everything once, then polls only for new
 * messages (`after_id`) every 4 s. Sending is optimistic; a failed send is removed and reported.
 */
export function useUrgentMessages(requestId: string, poll: boolean) {
  const queryClient = useQueryClient();
  const key = URGENT_KEYS.messages(requestId);

  const query = useQuery({
    queryKey: key,
    refetchInterval: poll ? POLL_MS : false,
    queryFn: async () => {
      const current = queryClient.getQueryData<ThreadMessage[]>(key) ?? [];
      const lastId = current.reduce((max, m) => (m.id > max ? m.id : max), 0);
      const fresh = await urgentApi.messages(requestId, lastId || undefined);
      return merge(current, fresh ?? []);
    },
  });

  const send = useMutation({
    mutationFn: (body: string) => urgentApi.sendMessage(requestId, body),
    onMutate: async (body) => {
      await queryClient.cancelQueries({ queryKey: key });
      const temp: ThreadMessage = {
        id: -Date.now(),
        body,
        sender: 'doctor',
        mine: true,
        created_at: new Date().toISOString(),
        pending: true,
      };
      queryClient.setQueryData<ThreadMessage[]>(key, (cur = []) => [...cur, temp]);
      return { tempId: temp.id };
    },
    onSuccess: ({ data }, _body, ctx) => {
      queryClient.setQueryData<ThreadMessage[]>(key, (cur = []) =>
        merge(
          cur.filter((m) => m.id !== ctx?.tempId),
          [data],
        ),
      );
    },
    onError: (_e, _body, ctx) => {
      queryClient.setQueryData<ThreadMessage[]>(key, (cur = []) =>
        cur.filter((m) => m.id !== ctx?.tempId),
      );
    },
  });

  return { query, send };
}
