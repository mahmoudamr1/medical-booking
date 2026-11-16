<?php

namespace App\Http\Requests\Review;

use App\Http\Requests\Concerns\ListFilters;
use Illuminate\Foundation\Http\FormRequest;

/** Public review list of one doctor: bounded pagination only. */
class ListDoctorReviewsRequest extends FormRequest
{
    use ListFilters;

    public function rules(): array
    {
        return [
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => $this->perPageRule(50),
        ];
    }
}
