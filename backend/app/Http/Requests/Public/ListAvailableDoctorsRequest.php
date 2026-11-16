<?php

namespace App\Http\Requests\Public;

use Illuminate\Foundation\Http\FormRequest;

class ListAvailableDoctorsRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'specialty' => ['nullable', 'string', 'max:100'],
            'governorate' => ['nullable', 'ulid'],
            'mode' => ['nullable', 'in:online,in_person'],
        ];
    }

    /** @return array{specialty: ?string, governorate_id: ?string, mode: ?string} filters in VolunteerMatcher's shape */
    public function filters(): array
    {
        return [
            'specialty' => $this->validated('specialty'),
            'governorate_id' => $this->validated('governorate'),
            'mode' => $this->validated('mode'),
        ];
    }
}
