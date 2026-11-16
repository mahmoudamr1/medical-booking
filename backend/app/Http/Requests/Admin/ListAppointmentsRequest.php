<?php

namespace App\Http\Requests\Admin;

use App\Enums\AppointmentStatus;
use App\Http\Requests\Concerns\ListFilters;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ListAppointmentsRequest extends FormRequest
{
    use ListFilters;

    public function rules(): array
    {
        return [
            'status' => ['nullable', Rule::in(AppointmentStatus::values())],
            'doctor_id' => ['nullable', 'ulid'], 'clinic_id' => ['nullable', 'ulid'],
            'q' => ['nullable', 'string', 'max:50'],
            ...$this->dateRangeRules(ordered: false),
            'per_page' => $this->perPageRule(100),
        ];
    }
}
