<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class DecideVerificationRequest extends FormRequest
{
    public function rules(): array
    {
        return ['notes' => ['nullable', 'string', 'max:2000']];
    }
}
