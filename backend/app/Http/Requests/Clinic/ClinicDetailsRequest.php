<?php

namespace App\Http\Requests\Clinic;

use App\Support\Phone;
use Illuminate\Foundation\Http\FormRequest;

class ClinicDetailsRequest extends FormRequest
{
    public function rules(): array
    {
        $required = $this->isMethod('post') ? 'required' : 'sometimes';

        return [
            'name_ar' => [$required, 'string', 'min:2', 'max:150'],
            'name_en' => ['sometimes', 'nullable', 'string', 'min:2', 'max:150'],
            'description_ar' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'description_en' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'phone' => ['sometimes', 'nullable', 'string', 'regex:'.Phone::CONTACT],
            'email' => ['sometimes', 'nullable', 'email', 'max:191'],
        ];
    }
}
