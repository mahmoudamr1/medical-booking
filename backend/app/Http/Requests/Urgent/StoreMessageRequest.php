<?php

namespace App\Http\Requests\Urgent;

use Illuminate\Foundation\Http\FormRequest;

class StoreMessageRequest extends FormRequest
{
    public function rules(): array
    {
        return ['body' => ['required', 'string', 'max:1000']];
    }
}
