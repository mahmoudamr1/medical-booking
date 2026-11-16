<?php

namespace App\Http\Requests\Doctor;

/** Optional date window; without `from` only today's and future exceptions are listed (unchanged default). */
class ListExceptionsRequest extends DoctorRequest
{
    public function rules(): array
    {
        return [
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:from'],
        ];
    }
}
