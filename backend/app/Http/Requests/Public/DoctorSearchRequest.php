<?php

namespace App\Http\Requests\Public;

use App\Enums\ConsultationType;
use App\Http\Requests\Concerns\ListFilters;
use App\Services\Search\DoctorSearch;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class DoctorSearchRequest extends FormRequest
{
    use ListFilters;

    public function rules(): array
    {
        return [
            'q' => ['nullable', 'string', 'max:100'],
            'specialty' => ['nullable', 'string', 'max:80'],
            'governorate' => ['nullable', 'ulid'],
            'city' => ['nullable', 'ulid'],
            'area' => ['nullable', 'ulid'],
            'clinic' => ['nullable', 'string', 'max:120'],
            'min_price' => ['nullable', 'numeric', 'min:0', 'max:100000'],
            'max_price' => array_merge(['nullable', 'numeric', 'min:0', 'max:100000'],
                $this->filled('min_price') ? ['gte:min_price'] : []),
            'min_rating' => ['nullable', 'numeric', 'min:0', 'max:5'],
            'consultation_type' => ['nullable', Rule::enum(ConsultationType::class)],
            'available_on' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:today'],
            'sort' => ['nullable', Rule::in(DoctorSearch::SORTS)],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => $this->perPageRule(50),
        ];
    }
}
