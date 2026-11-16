'use client';

import { AdminSheet } from './AdminSheet';
import { DoctorDetail } from './DoctorDetail';
import { useI18n } from '@/i18n/provider';

export function DoctorSheet({
  doctorId,
  onClose,
}: {
  doctorId: string | null;
  onClose: () => void;
}) {
  const { t } = useI18n();
  return (
    <AdminSheet open={!!doctorId} onClose={onClose} title={t('admin.doctors.profile')} wide>
      {doctorId && <DoctorDetail id={doctorId} />}
    </AdminSheet>
  );
}
