'use client';

import { Eye } from 'lucide-react';
import type { Appointment } from '@/types/api';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { BUSINESS_TZ } from '@/lib/dates';
import { useFormat, useT } from '@/i18n/provider';
import { ClinicAppointmentActions } from './ClinicAppointmentActions';

/** One page of clinic appointments (server-paginated by the caller); scrolls horizontally on phones. */
export function ClinicAppointmentsTable({
  items,
  onDetails,
}: {
  items: Appointment[];
  onDetails: (id: string) => void;
}) {
  const t = useT();
  const f = useFormat();
  return (
    <Table data-testid="clinic-appointments" className="min-w-[52rem]">
      <TableHeader>
        <TableRow>
          <TableHead className="ps-(--card-spacing) text-start">
            {t('clinic.appointments.when')}
          </TableHead>
          <TableHead className="text-start">{t('clinic.appointments.patient')}</TableHead>
          <TableHead className="text-start">{t('clinic.appointments.doctor')}</TableHead>
          <TableHead className="text-start">{t('clinic.appointments.service')}</TableHead>
          <TableHead className="text-start">{t('clinic.appointments.status')}</TableHead>
          <TableHead className="pe-(--card-spacing) text-end">{t('common.actions')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((a) => {
          const tz = a.timezone ?? BUSINESS_TZ;
          return (
            <TableRow key={a.id} data-reference={a.reference}>
              <TableCell className="ps-(--card-spacing) align-top">
                <p className="font-medium">
                  {f.date(a.starts_at, tz, { weekday: 'short', day: 'numeric', month: 'short' })}
                </p>
                <p className="text-muted-foreground tabular-nums">{f.time(a.starts_at, tz)}</p>
                <p className="font-mono text-xs text-muted-foreground" dir="ltr">
                  {a.reference}
                </p>
              </TableCell>
              <TableCell className="align-top">
                <p className="font-medium">{a.patient?.name ?? '—'}</p>
                {a.patient?.phone && (
                  <a
                    href={`tel:${a.patient.phone}`}
                    dir="ltr"
                    className="block text-xs text-muted-foreground hover:text-primary"
                  >
                    {a.patient.phone}
                  </a>
                )}
              </TableCell>
              <TableCell className="align-top">
                <p>{a.doctor?.name ?? '—'}</p>
                {a.branch && <p className="text-xs text-muted-foreground">{f.l(a.branch)}</p>}
              </TableCell>
              <TableCell className="align-top">
                <p>{a.service ? f.l(a.service) : '—'}</p>
                <p className="text-xs text-muted-foreground">
                  {t(`consultation.${a.consultation_type}`)} · {f.money(a.price)}
                </p>
              </TableCell>
              <TableCell className="align-top">
                <StatusBadge status={a.status} />
              </TableCell>
              <TableCell className="pe-(--card-spacing) align-top">
                <div className="flex flex-wrap justify-end gap-1.5">
                  <ClinicAppointmentActions appointment={a} compact />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDetails(a.id)}
                    aria-label={`${t('clinic.appointments.details')} ${a.reference}`}
                  >
                    <Eye aria-hidden />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
