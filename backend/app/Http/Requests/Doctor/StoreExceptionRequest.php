<?php

namespace App\Http\Requests\Doctor;

use Illuminate\Validation\Rule;

class StoreExceptionRequest extends DoctorRequest
{
    public function rules(): array
    {
        return [
            'date' => ['required', 'date_format:Y-m-d', 'after_or_equal:today'],
            'date_to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:date'],
            'type' => ['required', 'in:closed,custom_hours'],
            'starts_at' => ['required_if:type,custom_hours', 'nullable', 'date_format:H:i'],
            'ends_at' => ['required_if:type,custom_hours', 'nullable', 'date_format:H:i', 'after:starts_at'],
            'clinic_branch_id' => ['nullable', 'ulid', Rule::in($this->doctor()->activeBranchIds())],
            'reason' => ['nullable', 'string', 'max:255'],
        ];
    }
}
