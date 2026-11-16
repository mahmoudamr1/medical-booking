'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Building2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { RequireAuth } from '@/features/auth';
import { DashboardShell } from '@/components/layout/dashboard/DashboardShell';
import { fallbackNav } from '@/components/layout/dashboard/fallbackNav';
import { ClinicDetailsForm } from './ClinicDetailsForm';
import { ClinicInvitations } from './ClinicInvitations';
import { clinicPath } from './ClinicContext';
import { clinicApi } from '../api';
import { clinicKeys } from '../hooks/keys';
import { LoadingState } from '@/components/shared/states';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useT } from '@/i18n/provider';

/**
 * Entry point of the clinic dashboard. Members are redirected to their first clinic
 * (/dashboard/clinic/{clinicId}); others see pending invitations and can create a clinic.
 */
export function ClinicStartScreen() {
  const t = useT();
  const { user } = useAuth();
  return (
    <DashboardShell
      title={t('clinic.dash.title')}
      homeHref="/dashboard/clinic"
      nav={fallbackNav(user, t)}
    >
      <Suspense fallback={<LoadingState className="py-24" />}>
        <RequireAuth>
          <ClinicIndex />
        </RequireAuth>
      </Suspense>
    </DashboardShell>
  );
}

function ClinicIndex() {
  const t = useT();
  const router = useRouter();
  const { user } = useAuth();
  const [creating, setCreating] = useState(false);
  const firstClinic = user?.clinics[0]?.id;

  useEffect(() => {
    if (firstClinic && !creating) router.replace(clinicPath(firstClinic));
  }, [firstClinic, creating, router]);

  if (firstClinic && !creating) return <LoadingState className="py-24" />;

  return (
    <>
      <PageHeader
        title={t('clinic.dash.title')}
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus aria-hidden />
            {t('clinic.create.open')}
          </Button>
        }
      />
      <ClinicInvitations />
      <EmptyState
        icon={Building2}
        title={t('clinic.dash.noClinicsTitle')}
        description={t('clinic.dash.noClinicsBody')}
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={() => setCreating(true)}>{t('clinic.create.open')}</Button>
            <Link href="/clinics" className={buttonVariants({ variant: 'outline' })}>
              {t('clinic.dash.browseClinics')}
            </Link>
          </div>
        }
      />
      {creating && <CreateClinicDialog onClose={() => setCreating(false)} />}
    </>
  );
}

function CreateClinicDialog({ onClose }: { onClose: () => void }) {
  const t = useT();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { refresh } = useAuth();

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader className="text-start">
          <DialogTitle>{t('clinic.create.title')}</DialogTitle>
          <DialogDescription>{t('clinic.create.body')}</DialogDescription>
        </DialogHeader>
        <ClinicDetailsForm
          submitLabel={t('clinic.create.submit')}
          footer={
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
          }
          onSubmit={async (values) => {
            const { data } = await clinicApi.create(values);
            toast.success(t('clinic.create.created'));
            queryClient.invalidateQueries({ queryKey: clinicKeys.mine });
            await refresh(); // the new clinic appears in user.clinics
            router.push(clinicPath(data.id, 'branches'));
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
