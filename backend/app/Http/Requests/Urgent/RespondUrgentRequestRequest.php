<?php

namespace App\Http\Requests\Urgent;

use Illuminate\Foundation\Http\FormRequest;

/** Doctor action on an urgent request; only `complete` and `report` carry a payload. */
class RespondUrgentRequestRequest extends FormRequest
{
    public function rules(): array
    {
        return match ($this->route('action')) {
            'complete' => ['outcome_note' => ['nullable', 'string', 'max:2000']],
            'report' => ['reason' => ['required', 'string', 'min:5', 'max:500']],
            default => [],
        };
    }
}
