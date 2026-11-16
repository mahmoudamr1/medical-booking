'use client';

import MainLayout from '@/components/layout/MainLayout';
import { RequireAuth } from '@/features/auth';
import { ClinicInvitations } from '@/features/clinic';
import { NotificationsScreen } from '@/features/notifications';

export default function NotificationsPage() {
  return (
    <MainLayout>
      <RequireAuth>
        <NotificationsScreen>
          <ClinicInvitations />
        </NotificationsScreen>
      </RequireAuth>
    </MainLayout>
  );
}
