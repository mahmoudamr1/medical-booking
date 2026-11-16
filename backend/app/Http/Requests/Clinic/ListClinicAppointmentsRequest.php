<?php

namespace App\Http\Requests\Clinic;

use App\Enums\AppointmentStatus;
use App\Http\Requests\Concerns\ListFilters;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ListClinicAppointmentsRequest extends FormRequest
{
    use ListFilters;

    public function rules(): array
    {
        return [
            'branch_id' => ['nullable', 'ulid'],
            'doctor_id' => ['nullable', 'ulid'],
            'status' => ['nullable', Rule::in(AppointmentStatus::values())],
            ...$this->dateRangeRules(ordered: false),
            'q' => ['nullable', 'string', 'max:50'],
            'per_page' => $this->perPageRule(200),
        ];
    }
}
