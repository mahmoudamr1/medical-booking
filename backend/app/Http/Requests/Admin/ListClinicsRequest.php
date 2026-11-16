<?php

namespace App\Http\Requests\Admin;

use App\Enums\ClinicStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ListClinicsRequest extends FormRequest
{
    public function rules(): array
    {
        return ['q' => ['nullable', 'string', 'max:100'], 'status' => ['nullable', Rule::enum(ClinicStatus::class)]];
    }
}
