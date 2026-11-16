<?php

namespace App\Http\Requests\Clinic;

use Illuminate\Foundation\Http\FormRequest;

class UpdateBranchHoursRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'hours' => ['present', 'array', 'max:21'],
            'hours.*.day_of_week' => ['required', 'integer', 'between:0,6'],
            'hours.*.opens_at' => ['required', 'date_format:H:i'],
            'hours.*.closes_at' => ['required', 'date_format:H:i', 'after:hours.*.opens_at'],
        ];
    }
}
