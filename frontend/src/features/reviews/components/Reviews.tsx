'use client';

import { Stars } from './Stars';
import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { Flag, MessageSquareText } from 'lucide-react';
import { toast } from 'sonner';
import type { Review } from '../types';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState, LoadingState } from '@/components/shared/states';
import { Pagination } from '@/components/shared/Pagination';
import { Button } from '@/components/ui/button';
import { reviewsApi } from '../api';
import { errorMessage } from '@/lib/api/errors';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useFormat, useT } from '@/i18n/provider';
import { reviewKeys } from '../hooks/keys';

/** Public reviews for a doctor (paginated), with "report" for signed-in users. */
export function DoctorReviews({ doctorId }: { doctorId: string }) {
  const t = useT();
  const f = useFormat();
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [page, setPage] = useState(1);
  const [reporting, setReporting] = useState<Review | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: reviewKeys.page(doctorId, page),
    queryFn: () => reviewsApi.forDoctor(doctorId, page),
    placeholderData: keepPreviousData,
  });

  const report = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => reviewsApi.report(id, reason),
    onSuccess: ({ message }) => {
      toast.success(message || t('reviews.reported'));
      setReporting(null);
    },
    onError: (e) => setReportError(errorMessage(e, t)),
  });

  if (query.isPending) return <LoadingState rows={2} />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  if (query.data.items.length === 0)
    return <EmptyState icon={<MessageSquareText />} title={t('doctor.noReviews')} />;

  return (
    <div>
      <ul className="divide-y" data-testid="reviews-list">
        {query.data.items.map((r) => (
          <li key={r.id} className="space-y-2 py-4 first:pt-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <Stars value={r.rating} />
                <span className="text-sm font-medium">
                  {r.patient_display_name ?? t('reviews.anonymous')}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {r.created_at && (
                  <span>
                    {f.date(r.created_at, undefined, {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t('reviews.report')}
                  onClick={() => {
                    if (!user)
                      return router.push(`/auth/login?next=${encodeURIComponent(pathname)}`);
                    setReportError(null);
                    setReporting(r);
                  }}
                >
                  <Flag aria-hidden />
                </Button>
              </div>
            </div>
            {r.comment && <p className="text-sm leading-relaxed text-foreground/90">{r.comment}</p>}
          </li>
        ))}
      </ul>
      <Pagination meta={query.data.pagination} onPageChange={setPage} />
      <ConfirmDialog
        open={!!reporting}
        onOpenChange={(o) => !o && setReporting(null)}
        title={t('reviews.reportTitle')}
        description={t('reviews.reportBody')}
        confirmLabel={t('reviews.report')}
        pending={report.isPending}
        error={reportError}
        reason={{ label: t('common.reason'), required: true }}
        onConfirm={(reason) => {
          if (!reporting) return;
          if (reason.length < 5) return setReportError(t('reviews.reasonMin'));
          report.mutate({ id: reporting.id, reason });
        }}
      />
    </div>
  );
}
