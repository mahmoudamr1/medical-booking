<?php

namespace App\Http\Requests\Urgent;

use Illuminate\Foundation\Http\FormRequest;

class CancelUrgentRequestRequest extends FormRequest
{
    public function rules(): array
    {
        return ['reason' => ['nullable', 'string', 'max:200']];
    }
}
