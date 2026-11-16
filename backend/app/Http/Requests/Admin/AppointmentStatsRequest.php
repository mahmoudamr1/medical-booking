<?php

namespace App\Http\Requests\Admin;

use App\Http\Requests\Shared\DateRangeRequest;

class AppointmentStatsRequest extends DateRangeRequest
{
    public function rules(): array
    {
        return parent::rules() + ['group_by' => ['nullable', 'in:day,specialty,clinic']];
    }
}
