<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class ListReviewsRequest extends FormRequest
{
    public function rules(): array
    {
        return ['status' => ['nullable', 'in:published,hidden'], 'reported' => ['nullable', 'boolean']];
    }
}
