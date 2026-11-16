<?php

namespace App\Http\Requests\Doctor;

class ReplaceSchedulesRequest extends DoctorRequest
{
    public function rules(): array
    {
        return [
            'schedules' => ['present', 'array', 'max:70'],
            'schedules.*.clinic_branch_id' => ['nullable', 'ulid'],
            'schedules.*.day_of_week' => ['required', 'integer', 'between:0,6'],
            'schedules.*.starts_at' => ['required', 'date_format:H:i'],
            'schedules.*.ends_at' => ['required', 'date_format:H:i', 'after:schedules.*.starts_at'],
            'schedules.*.breaks' => ['nullable', 'array', 'max:5'],
            'schedules.*.breaks.*.starts_at' => ['required', 'date_format:H:i'],
            'schedules.*.breaks.*.ends_at' => ['required', 'date_format:H:i'],
        ];
    }
}
