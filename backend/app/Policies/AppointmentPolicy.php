<?php

namespace App\Policies;

use App\Enums\ClinicPermission;
use App\Models\Appointment;
use App\Models\User;

class AppointmentPolicy
{
    /** Participants, staff of the owning clinic, and overseeing admins. */
    public function view(User $user, Appointment $appointment): bool
    {
        $appointment->loadMissing(['patientProfile', 'doctorProfile']);

        return $appointment->patientProfile->user_id === $user->id
            || $appointment->doctorProfile->user_id === $user->id
            || ($appointment->clinic_id && $user->hasClinicPermission($appointment->clinic_id, ClinicPermission::ViewAppointments))
            || $user->hasPermission('appointments.oversee');
    }
}
