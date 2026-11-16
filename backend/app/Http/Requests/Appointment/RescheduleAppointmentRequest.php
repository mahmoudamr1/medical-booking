<?php

namespace App\Http\Requests\Appointment;

use App\Http\Requests\Concerns\AuthorizesAppointmentAccess;
use Illuminate\Foundation\Http\FormRequest;

class RescheduleAppointmentRequest extends FormRequest
{
    use AuthorizesAppointmentAccess;

    public function rules(): array
    {
        return [
            'starts_at' => ['required', 'date', 'after:now'],
            'service_id' => ['nullable', 'ulid'],
        ];
    }
}
