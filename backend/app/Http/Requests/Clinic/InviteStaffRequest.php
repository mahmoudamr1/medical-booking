<?php

namespace App\Http\Requests\Clinic;

use App\Enums\ClinicRole;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class InviteStaffRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'email' => ['required', 'email'],
            'role' => ['required', Rule::in(ClinicRole::assignableValues())],
        ];
    }
}
