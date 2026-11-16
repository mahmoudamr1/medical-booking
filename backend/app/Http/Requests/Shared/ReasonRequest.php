<?php

namespace App\Http\Requests\Shared;

use Illuminate\Foundation\Http\FormRequest;

/** Optional free-text reason for a state change (appointment transitions, review moderation). */
class ReasonRequest extends FormRequest
{
    public function rules(): array
    {
        return ['reason' => ['nullable', 'string', 'max:500']];
    }
}
