<?php

namespace App\Http\Requests\Appointment;

use App\Http\Requests\Concerns\ListFilters;
use Illuminate\Foundation\Http\FormRequest;

class ListPatientAppointmentsRequest extends FormRequest
{
    use ListFilters;

    public function rules(): array
    {
        return [
            'group' => ['nullable', 'in:upcoming,pending,completed,cancelled,past'],
            'per_page' => $this->perPageRule(50),
        ];
    }
}
