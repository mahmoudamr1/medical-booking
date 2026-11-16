<?php

namespace App\Http\Requests\Admin;

use App\Enums\ClinicStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateClinicStatusRequest extends FormRequest
{
    public function rules(): array
    {
        return ['status' => ['required', Rule::enum(ClinicStatus::class)], 'reason' => ['nullable', 'string', 'max:500']];
    }
}
