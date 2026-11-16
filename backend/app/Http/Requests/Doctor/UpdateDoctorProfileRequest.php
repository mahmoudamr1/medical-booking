<?php

namespace App\Http\Requests\Doctor;

class UpdateDoctorProfileRequest extends DoctorRequest
{
    public function rules(): array
    {
        return [
            'title_ar' => ['sometimes', 'nullable', 'string', 'max:150'],
            'title_en' => ['sometimes', 'nullable', 'string', 'max:150'],
            'bio_ar' => ['sometimes', 'nullable', 'string', 'max:3000'],
            'bio_en' => ['sometimes', 'nullable', 'string', 'max:3000'],
            'qualifications' => ['sometimes', 'nullable', 'string', 'max:3000'],
            'years_experience' => ['sometimes', 'integer', 'min:0', 'max:70'],
            'gender' => ['sometimes', 'nullable', 'in:male,female'],
            'license_number' => ['sometimes', 'nullable', 'string', 'max:50'],
        ];
    }
}
