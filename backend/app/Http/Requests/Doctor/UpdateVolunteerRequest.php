<?php

namespace App\Http\Requests\Doctor;

use Illuminate\Validation\Rule;

class UpdateVolunteerRequest extends DoctorRequest
{
    public function rules(): array
    {
        return [
            'opt_in' => ['required', 'boolean'],
            'specialty_ids' => ['required_if:opt_in,true', 'array', 'max:5'],
            'specialty_ids.*' => ['ulid', 'distinct', Rule::exists('specialties', 'id')->where('is_active', true)],
            'locations' => ['required_if:opt_in,true', 'array', 'min:1', 'max:10'],
            'locations.*.governorate_id' => ['required', 'ulid', 'exists:governorates,id'],
            'locations.*.city_id' => ['nullable', 'ulid', 'exists:cities,id'],
            'accepts_online' => ['sometimes', 'boolean'],
            'accepts_in_person' => ['sometimes', 'boolean'],
            'max_concurrent_requests' => ['sometimes', 'integer', 'min:1', 'max:10'],
        ];
    }
}
