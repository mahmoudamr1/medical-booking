<?php

namespace App\Http\Requests\Admin;

use App\Enums\UrgentStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ListUrgentRequestsRequest extends FormRequest
{
    public function rules(): array
    {
        return ['status' => ['nullable', Rule::in(UrgentStatus::values())], 'flagged' => ['nullable', 'boolean']];
    }
}
