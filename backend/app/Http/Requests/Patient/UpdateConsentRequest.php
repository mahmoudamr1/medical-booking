<?php

namespace App\Http\Requests\Patient;

use Illuminate\Foundation\Http\FormRequest;

class UpdateConsentRequest extends FormRequest
{
    public function rules(): array
    {
        return ['granted' => ['required', 'boolean']];
    }
}
