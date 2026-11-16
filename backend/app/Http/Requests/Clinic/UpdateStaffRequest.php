<?php

namespace App\Http\Requests\Clinic;

use App\Enums\ClinicRole;
use App\Enums\MembershipStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateStaffRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'role' => ['sometimes', Rule::in(ClinicRole::assignableValues())],
            'status' => ['sometimes', Rule::in([MembershipStatus::Active->value, MembershipStatus::Suspended->value])],
        ];
    }
}
