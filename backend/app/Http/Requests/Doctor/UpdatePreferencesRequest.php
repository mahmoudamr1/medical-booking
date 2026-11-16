<?php

namespace App\Http\Requests\Doctor;

use App\Enums\BookingMode;
use Illuminate\Validation\Rule;

class UpdatePreferencesRequest extends DoctorRequest
{
    public function rules(): array
    {
        return [
            'accepts_bookings' => ['sometimes', 'boolean'],
            'booking_mode' => ['sometimes', Rule::enum(BookingMode::class)],
            'min_cancellation_hours' => ['sometimes', 'integer', 'min:0', 'max:168'],
            'lead_time_minutes' => ['sometimes', 'integer', 'min:0', 'max:10080'],
            'horizon_days' => ['sometimes', 'integer', 'min:1', 'max:365'],
            'buffer_minutes' => ['sometimes', 'integer', 'min:0', 'max:120'],
            'timezone' => ['sometimes', 'timezone:all'],
        ];
    }
}
