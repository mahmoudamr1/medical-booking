<?php

namespace App\Http\Requests\Appointment;

use App\Http\Requests\Concerns\AuthorizesAppointmentAccess;
use App\Http\Requests\Shared\ReasonRequest;

class TransitionAppointmentRequest extends ReasonRequest
{
    use AuthorizesAppointmentAccess;
}
