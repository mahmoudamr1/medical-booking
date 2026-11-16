<?php

namespace Tests\Concerns;

use App\Enums\AppointmentStatus;
use App\Models\Appointment;
use App\Models\DoctorProfile;
use App\Models\MedicalService;
use App\Models\PatientProfile;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Str;

/**
 * Appointments persisted directly in a chosen state, bypassing the booking rules, so state-machine
 * tests can start anywhere. Use BuildsSchedules::book() when the booking flow itself is under test.
 */
trait BuildsAppointments
{
    protected function appointmentIn(
        AppointmentStatus $status,
        DoctorProfile $doctor,
        MedicalService $service,
        User $patient,
        string $localStart,
    ): Appointment {
        $startsAt = CarbonImmutable::parse($localStart, $doctor->timezone)->utc();
        $endsAt = $startsAt->addMinutes($service->duration_minutes);

        return $this->forceStatus(new Appointment([
            'reference' => 'MB-'.Str::upper(Str::random(7)),
            'doctor_profile_id' => $doctor->id,
            'patient_profile_id' => PatientProfile::forUser($patient)->id,
            'medical_service_id' => $service->id,
            'clinic_branch_id' => $service->clinic_branch_id,
            'clinic_id' => $service->clinic_id,
            'consultation_type' => $service->consultation_type,
            'starts_at' => $startsAt,
            'ends_at' => $endsAt,
            'blocked_until' => $endsAt,
            'price' => $service->price,
            'booked_by_user_id' => $patient->id,
            'booked_via' => 'patient',
        ]), $status);
    }

    /** Rewrites the stored status, plus the columns the database checks tie to it, without a transition. */
    protected function forceStatus(Appointment $appointment, AppointmentStatus $status): Appointment
    {
        $appointment->status = $status;
        $appointment->hold_expires_at = $status === AppointmentStatus::PendingConfirmation ? $appointment->starts_at : null;
        $appointment->cancelled_at = $status->isCancellation() ? now()->toImmutable() : null;
        $appointment->save();

        return $appointment;
    }
}
