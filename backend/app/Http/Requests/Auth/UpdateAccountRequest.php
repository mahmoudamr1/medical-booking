<?php

namespace App\Http\Requests\Auth;

use App\Support\Phone;
use Illuminate\Foundation\Http\FormRequest;

class UpdateAccountRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'min:3', 'max:120'],
            'phone' => ['sometimes', 'nullable', 'string', 'regex:'.Phone::EGYPT_MOBILE, 'unique:users,phone,'.$this->user()->id],
            'locale' => ['sometimes', 'in:ar,en'],
        ];
    }
}
