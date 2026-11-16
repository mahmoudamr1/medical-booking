<?php

namespace App\Http\Requests\Admin;

use App\Enums\VerificationStatus;
use App\Http\Requests\Concerns\ListFilters;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ListDoctorVerificationsRequest extends FormRequest
{
    use ListFilters;

    public function rules(): array
    {
        return [
            'verification_status' => ['nullable', Rule::enum(VerificationStatus::class)],
            'q' => ['nullable', 'string', 'max:100'],
            'per_page' => $this->perPageRule(100),
        ];
    }
}
