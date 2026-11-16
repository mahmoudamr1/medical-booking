<?php

namespace App\Http\Requests\Admin;

use App\Enums\UserStatus;
use App\Http\Requests\Concerns\ListFilters;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ListUsersRequest extends FormRequest
{
    use ListFilters;

    public function rules(): array
    {
        return [
            'q' => ['nullable', 'string', 'max:100'],
            'role' => ['nullable', 'in:patient,doctor,admin'],
            'status' => ['nullable', Rule::enum(UserStatus::class)],
            'per_page' => $this->perPageRule(100),
        ];
    }
}
