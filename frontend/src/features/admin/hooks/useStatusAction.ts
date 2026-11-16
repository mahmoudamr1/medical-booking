'use client';

import { useState } from 'react';
import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useT } from '@/i18n/provider';
import { errorMessage } from '@/lib/api/errors';

/**
 * Shared state for "pick a row → confirm in a dialog (optional reason) → mutate" flows.
 * API errors (409 business rules, 422) are shown inside the dialog; success toasts and
 * invalidates the given query roots.
 */
export function useConfirmAction<T, A extends string = string>(
  run: (target: T, action: A, reason: string) => Promise<{ message: string }>,
  invalidate: QueryKey[],
) {
  const t = useT();
  const queryClient = useQueryClient();
  const [target, setTarget] = useState<{ item: T; action: A } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: ({ item, action, reason }: { item: T; action: A; reason: string }) =>
      run(item, action, reason),
    onSuccess: (res) => {
      toast.success(res.message || t('admin.done'));
      invalidate.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
      setTarget(null);
    },
    onError: (e) => setError(errorMessage(e, t)),
  });

  return {
    target,
    error,
    pending: mutation.isPending,
    open: (item: T, action: A) => {
      setError(null);
      setTarget({ item, action });
    },
    close: () => !mutation.isPending && setTarget(null),
    confirm: (reason: string) =>
      target && mutation.mutate({ item: target.item, action: target.action, reason }),
  };
}
