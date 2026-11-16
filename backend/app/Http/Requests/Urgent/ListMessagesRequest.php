<?php

namespace App\Http\Requests\Urgent;

use Illuminate\Foundation\Http\FormRequest;

class ListMessagesRequest extends FormRequest
{
    public function rules(): array
    {
        return ['after_id' => ['nullable', 'integer', 'min:0']];
    }
}
