'use client';

import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ExternalLink } from 'lucide-react';
import {
  CLINIC_PERMISSIONS as P,
  ClinicDetailsForm,
  useClinic,
  clinicApi,
  clinicKeys,
} from '@/features/clinic';
import { ToneBadge } from '@/components/shared/StatusBadge';
import { ErrorState, LoadingState, Section } from '@/components/shared/states';
import { PageHeader } from '@/components/shared/PageHeader';
import { buttonVariants } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useT } from '@/i18n/provider';

export default function ClinicSettingsPage() {
  const t = useT();
  const queryClient = useQueryClient();
  const { refresh } = useAuth();
  const { clinicId, can } = useClinic();
  const editable = can(P.manageOrganization);
  const query = useQuery({
    queryKey: clinicKeys.of(clinicId, 'manage'),
    queryFn: () => clinicApi.manage(clinicId),
  });

  return (
    <>
      <PageHeader
        title={t('clinic.settings.title')}
        description={t('clinic.settings.subtitle')}
        actions={
          query.data && (
            <Link
              href={`/clinics/${query.data.slug}`}
              className={buttonVariants({ variant: 'outline' })}
            >
              <ExternalLink aria-hidden />
              {t('clinic.settings.publicPage')}
            </Link>
          )
        }
      />
      {!editable && (
        <p className="rounded-lg bg-muted px-4 py-2 text-sm text-muted-foreground">
          {t('clinic.dash.readOnly')}
        </p>
      )}
      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : (
        <Section
          actions={
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              {t('clinic.settings.status')}
              <ToneBadge tone={query.data.status === 'active' ? 'success' : 'danger'}>
                {query.data.status === 'active'
                  ? t('clinic.settings.statusActive')
                  : t('clinic.settings.statusSuspended')}
              </ToneBadge>
            </span>
          }
        >
          <ClinicDetailsForm
            key={query.dataUpdatedAt}
            clinic={query.data}
            readOnly={!editable}
            onSubmit={async (values) => {
              const { data } = await clinicApi.updateManage(clinicId, values);
              queryClient.setQueryData(clinicKeys.of(clinicId, 'manage'), data);
              toast.success(t('common.saved'));
              await refresh(); // clinic names in the switcher come from auth/me
            }}
          />
        </Section>
      )}
    </>
  );
}
