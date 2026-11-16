<?php

namespace App\Http\Requests\Public;

use App\Http\Requests\Concerns\ListFilters;
use Illuminate\Foundation\Http\FormRequest;

class ListClinicsRequest extends FormRequest
{
    use ListFilters;

    public function rules(): array
    {
        return [
            'q' => ['nullable', 'string', 'max:100'],
            'governorate' => ['nullable', 'ulid'],
            'city' => ['nullable', 'ulid'],
            'type' => ['nullable', 'in:clinic,hospital,medical_center'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => $this->perPageRule(50),
        ];
    }
}
