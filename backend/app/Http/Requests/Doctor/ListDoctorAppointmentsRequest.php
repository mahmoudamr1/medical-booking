<?php

namespace App\Http\Requests\Doctor;

use App\Http\Requests\Concerns\ListFilters;

class ListDoctorAppointmentsRequest extends DoctorRequest
{
    use ListFilters;

    public function rules(): array
    {
        return $this->dateRangeRules() + [
            'status' => ['nullable', 'string'],
            'per_page' => $this->perPageRule(500),
        ];
    }
}
