<?php

namespace App\Http\Requests\Admin;

use App\Http\Requests\Concerns\ListFilters;
use Illuminate\Foundation\Http\FormRequest;

class ListAuditLogsRequest extends FormRequest
{
    use ListFilters;

    public function rules(): array
    {
        return [
            'action' => ['nullable', 'string', 'max:100'],
            'actor_id' => ['nullable', 'ulid'],
            'subject_id' => ['nullable', 'string', 'max:26'],
            ...$this->dateRangeRules(ordered: false),
            'per_page' => $this->perPageRule(200),
        ];
    }
}
