<?php

namespace App\Http\Requests\Notification;

use App\Http\Requests\Concerns\ListFilters;
use Illuminate\Foundation\Http\FormRequest;

class ListNotificationsRequest extends FormRequest
{
    use ListFilters;

    public function rules(): array
    {
        return [
            'unread' => ['nullable', 'boolean'],
            'per_page' => $this->perPageRule(50),
        ];
    }
}
