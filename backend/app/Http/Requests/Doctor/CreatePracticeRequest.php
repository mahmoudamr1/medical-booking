<?php

namespace App\Http\Requests\Doctor;

use App\Support\Phone;

class CreatePracticeRequest extends DoctorRequest
{
    public function rules(): array
    {
        return [
            'name_ar' => ['required', 'string', 'max:150'],
            'name_en' => ['nullable', 'string', 'max:150'],
            'city_id' => ['required', 'ulid', 'exists:cities,id'],
            'area_id' => ['nullable', 'ulid', 'exists:areas,id'],
            'address_ar' => ['required', 'string', 'max:255'],
            'address_en' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'regex:'.Phone::CONTACT],
        ];
    }
}
