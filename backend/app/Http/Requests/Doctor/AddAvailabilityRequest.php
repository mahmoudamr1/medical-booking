<?php

namespace App\Http\Requests\Doctor;

class AddAvailabilityRequest extends DoctorRequest
{
    public function rules(): array
    {
        return [
            'kind' => ['required', 'in:now,tonight,scheduled'],
            'hours' => ['required_if:kind,now', 'integer', 'min:1', 'max:12'],
            'starts_at' => ['required_if:kind,scheduled', 'nullable', 'date', 'after_or_equal:now'],
            'ends_at' => ['required_if:kind,scheduled', 'nullable', 'date', 'after:starts_at'],
            'mode' => ['required', 'in:online,in_person,both'],
        ];
    }
}
