<?php

namespace App\Http\Requests\Clinic;

use Illuminate\Foundation\Http\FormRequest;

class ListClinicSchedulesRequest extends FormRequest
{
    public function rules(): array
    {
        return ['doctor_id' => ['nullable', 'ulid']];
    }
}
