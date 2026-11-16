'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ErrorState, LoadingState, Section } from '@/components/shared/states';
import { Switch } from '@/components/ui/switch';
import { patientApi } from '../api';
import { errorMessage } from '@/lib/api/errors';
import { useFormat, useT } from '@/i18n/provider';
import type { TranslationKey } from '@/i18n/translate';
import { patientKeys } from '../hooks/keys';

/** Only these consent types can be changed via PUT /consents/{type}; others are shown read-only. */
const EDITABLE_CONSENTS = ['marketing', 'medical_data_processing'];

export function Consents() {
  const t = useT();
  const f = useFormat();
  const queryClient = useQueryClient();
  const consents = useQuery({ queryKey: patientKeys.consents, queryFn: patientApi.consents });
  const update = useMutation({
    mutationFn: ({ type, granted }: { type: string; granted: boolean }) =>
      patientApi.updateConsent(type, granted),
    onSuccess: ({ data }) => {
      queryClient.setQueryData(patientKeys.consents, data);
      toast.success(t('patient.consentUpdated'));
    },
    onError: (e) => toast.error(errorMessage(e, t)),
  });

  return (
    <Section
      title={t('patient.consentsSection')}
      description={t('patientPanel.profile.consentsHint')}
    >
      {consents.isPending ? (
        <LoadingState />
      ) : consents.isError ? (
        <ErrorState error={consents.error} onRetry={() => consents.refetch()} />
      ) : (
        <ul className="divide-y divide-border">
          {consents.data.map((c) => (
            <li key={c.type} className="flex items-center justify-between gap-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {t(`patient.consent.${c.type}` as TranslationKey)}
                </p>
                {!EDITABLE_CONSENTS.includes(c.type) && (
                  <p className="text-xs text-muted-foreground">{t('patient.consentReadOnly')}</p>
                )}
                {c.updated_at && (
                  <p className="text-xs text-muted-foreground">{f.dateTime(c.updated_at)}</p>
                )}
              </div>
              <Switch
                checked={c.granted}
                disabled={update.isPending || !EDITABLE_CONSENTS.includes(c.type)}
                onCheckedChange={(granted) => update.mutate({ type: c.type, granted })}
                aria-label={t(`patient.consent.${c.type}` as TranslationKey)}
              />
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
