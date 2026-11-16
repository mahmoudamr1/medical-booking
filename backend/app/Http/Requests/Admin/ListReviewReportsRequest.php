<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class ListReviewReportsRequest extends FormRequest
{
    public function rules(): array
    {
        return ['status' => ['nullable', 'in:open,resolved,dismissed']];
    }
}
