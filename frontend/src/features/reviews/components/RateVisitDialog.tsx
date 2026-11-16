'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Star } from 'lucide-react';
import { toast } from 'sonner';
import type { Appointment } from '@/types/api';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, Textarea } from '@/components/ui/form';
import { reviewsApi } from '../api';
import { isApiError } from '@/lib/api/client';
import { errorMessage } from '@/lib/api/errors';
import { useT } from '@/i18n/provider';
import { cn } from '@/lib/utils';
import { appointmentKeys } from '@/features/appointments';
import { reviewKeys } from '../hooks/keys';

/** "Rate visit" dialog for a completed appointment (POST /appointments/{id}/review). */
export function RateVisitDialog({
  appointment,
  open,
  onOpenChange,
}: {
  appointment: Appointment;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const t = useT();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = useMutation({
    mutationFn: () =>
      reviewsApi.create(appointment.id, { rating, comment: comment.trim() || undefined }),
    onSuccess: ({ message }) => {
      toast.success(message || t('reviews.thanks'));
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: appointmentKeys.patient });
      queryClient.invalidateQueries({ queryKey: appointmentKeys.detail(appointment.id) });
      if (appointment.doctor)
        queryClient.invalidateQueries({ queryKey: reviewKeys.doctor(appointment.doctor.id) });
    },
    onError: (e) => {
      if (isApiError(e) && e.code === 'already_reviewed') {
        toast.info(e.message);
        onOpenChange(false);
        queryClient.invalidateQueries({ queryKey: appointmentKeys.patient });
        return;
      }
      setError(errorMessage(e, t));
    },
  });

  const shown = hover || rating;

  return (
    <Dialog open={open} onOpenChange={(o) => !submit.isPending && onOpenChange(o)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('reviews.rateTitle')}</DialogTitle>
          <DialogDescription>
            {t('reviews.rateBody', { doctor: appointment.doctor?.name ?? '' })}
          </DialogDescription>
        </DialogHeader>
        <fieldset>
          <legend className="mb-2 text-sm font-medium">{t('reviews.yourRating')}</legend>
          <div
            className="flex gap-1"
            role="radiogroup"
            aria-label={t('reviews.yourRating')}
            onMouseLeave={() => setHover(0)}
          >
            {[1, 2, 3, 4, 5].map((i) => (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={rating === i}
                aria-label={t('reviews.starsLabel', { value: i })}
                onMouseEnter={() => setHover(i)}
                onClick={() => setRating(i)}
                className="flex size-11 items-center justify-center rounded-lg hover:bg-muted"
              >
                <Star
                  className={cn(
                    'size-7',
                    i <= shown ? 'fill-amber-400 text-amber-400' : 'text-slate-300',
                  )}
                  aria-hidden
                />
              </button>
            ))}
          </div>
        </fieldset>
        <Field label={`${t('reviews.comment')} (${t('common.optional')})`} htmlFor="review-comment">
          <Textarea
            id="review-comment"
            maxLength={1000}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </Field>
        {error && (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {error}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submit.isPending}>
            {t('common.cancel')}
          </Button>
          <Button
            disabled={rating === 0 || submit.isPending}
            onClick={() => {
              setError(null);
              submit.mutate();
            }}
          >
            {submit.isPending ? t('common.saving') : t('reviews.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
