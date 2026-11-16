<?php

namespace App\Http\Requests\Auth;

use App\Http\Requests\Concerns\RequiresSpaSession;
use App\Support\Phone;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class RegisterRequest extends FormRequest
{
    use RequiresSpaSession;

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:3', 'max:120'],
            'email' => ['required', 'string', 'email:rfc', 'max:191', 'unique:users,email'],
            'phone' => ['nullable', 'string', 'regex:'.Phone::EGYPT_MOBILE, 'unique:users,phone'],
            'password' => ['required', 'confirmed', Password::defaults()],
            'account_type' => ['required', 'in:patient,doctor'],
            'locale' => ['nullable', 'in:ar,en'],
            'accept_terms' => ['accepted'],
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('email')) {
            $this->merge(['email' => mb_strtolower(trim((string) $this->input('email')))]);
        }
    }
}
