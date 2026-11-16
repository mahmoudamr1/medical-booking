<?php

namespace App\Http\Requests\Patient;

use App\Http\Requests\Concerns\LocationRules;
use Illuminate\Foundation\Http\FormRequest;

class UpdatePatientProfileRequest extends FormRequest
{
    use LocationRules;

    public function rules(): array
    {
        return [
            'date_of_birth' => ['nullable', 'date', 'before:today', 'after:1900-01-01'],
            'gender' => ['nullable', 'in:male,female'],
            'governorate_id' => ['nullable', 'ulid', 'exists:governorates,id'],
            'city_id' => ['nullable', 'ulid', $this->cityOfGovernorate()],
        ];
    }
}
