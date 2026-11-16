<?php

namespace App\Http\Requests\Urgent;

use Illuminate\Foundation\Http\FormRequest;

class ListDoctorUrgentRequestsRequest extends FormRequest
{
    public function rules(): array
    {
        return ['status' => ['nullable', 'in:open,accepted,closed']];
    }
}
