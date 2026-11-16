'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import type { AvailabilitySlot } from '@/features/booking';
import { FormAlert } from '@/components/shared/FormAlert';
import { SlotPicker, bookingKeys } from '@/features/booking';
import { ErrorState, LoadingState } from '@/components/shared/states';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, NativeSelect } from '@/components/ui/form';
import { clinicApi } from '../api';
import { clinicKeys } from '../hooks/keys';
import { isApiError } from '@/lib/api/client';
import { applyFieldErrors, errorMessage } from '@/lib/api/errors';
import { BUSINESS_TZ } from '@/lib/dates';
import { useFormat, useT } from '@/i18n/provider';
import {
  PATIENT_FIELDS,
  PatientFields,
  usePatientSchema,
  type PatientValues,
} from './BookPatientFields';
import { useClinic } from './ClinicContext';
import { uniqueDoctors, useClinicAffiliations, useClinicServices } from '../hooks/useClinicData';

export function BookForm({
  onClose,
  onBooked,
}: {
  onClose: () => void;
  onBooked?: (id: string) => void;
}) {
  const t = useT();
  const f = useFormat();
  const queryClient = useQueryClient();
  const { clinicId } = useClinic();
  const affiliations = useClinicAffiliations(clinicId);
  const services = useClinicServices(clinicId);

  const [doctorId, setDoctorId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [slot, setSlot] = useState<AvailabilitySlot | null>(null);
  const [slotError, setSlotError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const schema = usePatientSchema();
  const { register, handleSubmit, setError, formState } = useForm<PatientValues>({
    resolver: zodResolver(schema),
    defaultValues: { patient_email: '', patient_name: '', patient_phone: '', notes: '' },
  });
  const err = formState.errors;

  const doctors = uniqueDoctors(affiliations.data);
  const doctorServices = (services.data ?? []).filter(
    (s) => s.doctor_id === doctorId && s.is_active,
  );

  const submit = handleSubmit(async (v) => {
    setFormError(null);
    setConflict(null);
    if (!doctorId || !serviceId || !slot) {
      setSlotError(t('clinic.book.slotRequired'));
      return;
    }
    try {
      const { data, message } = await clinicApi.book(clinicId, {
        doctor_id: doctorId,
        service_id: serviceId,
        starts_at: slot.starts_at,
        patient_email: v.patient_email,
        patient_name: v.patient_name || undefined,
        patient_phone: v.patient_phone || undefined,
        notes: v.notes || undefined,
      });
      toast.success(message || t('clinic.book.success', { reference: data.reference }), {
        description: message ? t('clinic.book.success', { reference: data.reference }) : undefined,
      });
      queryClient.invalidateQueries({ queryKey: clinicKeys.of(clinicId, 'appointments') });
      queryClient.invalidateQueries({ queryKey: clinicKeys.of(clinicId, 'reports') });
      queryClient.invalidateQueries({ queryKey: bookingKeys.doctor(doctorId) });
      onBooked?.(data.id);
      onClose();
    } catch (e) {
      if (isApiError(e) && e.status === 409) {
        // booking_conflict: the slot was taken meanwhile — refresh availability and ask for another.
        setConflict(e.message || t('clinic.extra.slotTaken'));
        setSlot(null);
        queryClient.invalidateQueries({ queryKey: bookingKeys.availability(doctorId, serviceId) });
        return;
      }
      const applied = applyFieldErrors(e, setError, PATIENT_FIELDS);
      const other = isApiError(e)
        ? (e.fieldError('starts_at') ?? e.fieldError('service_id') ?? e.fieldError('doctor_id'))
        : undefined;
      if (other) setFormError(other);
      else if (!applied) setFormError(errorMessage(e, t));
    }
  });

  return (
    <>
      <DialogHeader className="text-start">
        <DialogTitle>{t('clinic.book.title')}</DialogTitle>
        <DialogDescription>{t('clinic.book.description')}</DialogDescription>
      </DialogHeader>

      {affiliations.isPending || services.isPending ? (
        <LoadingState />
      ) : affiliations.isError || services.isError ? (
        <ErrorState
          error={affiliations.error ?? services.error}
          onRetry={() => {
            affiliations.refetch();
            services.refetch();
          }}
        />
      ) : doctors.length === 0 ? (
        <EmptyState title={t('clinic.book.noDoctors')} />
      ) : (
        <form onSubmit={submit} noValidate className="space-y-5">
          <FormAlert message={formError} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('clinic.book.doctor')} htmlFor="b-doctor" required>
              <NativeSelect
                id="b-doctor"
                value={doctorId}
                onChange={(e) => {
                  setDoctorId(e.target.value);
                  setServiceId('');
                  setSlot(null);
                  setConflict(null);
                }}
              >
                <option value="">{t('clinic.book.chooseDoctor')}</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {[d.name, f.l(d, 'title')].filter(Boolean).join(' – ')}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field
              label={t('clinic.book.service')}
              htmlFor="b-service"
              required
              hint={
                doctorId && doctorServices.length === 0 ? t('clinic.book.noServices') : undefined
              }
            >
              <NativeSelect
                id="b-service"
                value={serviceId}
                disabled={!doctorId || doctorServices.length === 0}
                onChange={(e) => {
                  setServiceId(e.target.value);
                  setSlot(null);
                  setConflict(null);
                }}
              >
                <option value="">{t('clinic.book.chooseService')}</option>
                {doctorServices.map((s) => (
                  <option key={s.id} value={s.id}>
                    {[
                      f.l(s),
                      t(`consultation.${s.consultation_type}`),
                      t('common.minutes', { count: f.number(s.duration_minutes) }),
                      f.money(s.price),
                      s.branch ? f.l(s.branch) : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">{t('clinic.book.slot')}</p>
            {conflict && (
              <p
                role="alert"
                className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
              >
                {conflict}
              </p>
            )}
            {doctorId && serviceId ? (
              <SlotPicker
                key={`${doctorId}:${serviceId}`}
                doctorId={doctorId}
                serviceId={serviceId}
                tz={BUSINESS_TZ}
                selected={slot}
                onSelect={(s) => {
                  setSlot(s);
                  setSlotError(null);
                }}
              />
            ) : (
              <p className="rounded-lg bg-muted px-3 py-4 text-center text-sm text-muted-foreground">
                {t('clinic.book.chooseDoctorAndService')}
              </p>
            )}
            {slot && (
              <p className="text-sm font-medium text-primary">
                {t('clinic.book.selectedSlot', { when: f.dateTime(slot.starts_at) })}
              </p>
            )}
            {slotError && !slot && (
              <p role="alert" className="text-xs font-medium text-destructive">
                {slotError}
              </p>
            )}
          </div>

          <PatientFields register={register} errors={err} />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={formState.isSubmitting}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={formState.isSubmitting}>
              {formState.isSubmitting ? t('clinic.book.submitting') : t('clinic.book.submit')}
            </Button>
          </DialogFooter>
        </form>
      )}
    </>
  );
}
