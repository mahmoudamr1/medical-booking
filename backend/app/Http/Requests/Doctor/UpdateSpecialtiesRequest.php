<?php

namespace App\Http\Requests\Doctor;

use Illuminate\Validation\Rule;

class UpdateSpecialtiesRequest extends DoctorRequest
{
    public function rules(): array
    {
        return [
            'specialty_ids' => ['required', 'array', 'min:1', 'max:3'],
            'specialty_ids.*' => ['ulid', 'distinct', Rule::exists('specialties', 'id')->where('is_active', true)],
            'primary_id' => ['required', 'ulid', 'in_array:specialty_ids.*'],
        ];
    }
}
