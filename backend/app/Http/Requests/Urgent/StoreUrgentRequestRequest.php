<?php

namespace App\Http\Requests\Urgent;

use App\Enums\UrgentSeverity;
use App\Http\Requests\Concerns\LocationRules;
use App\Support\Phone;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreUrgentRequestRequest extends FormRequest
{
    use LocationRules;

    public function rules(): array
    {
        return [
            'severity' => ['required', Rule::enum(UrgentSeverity::class)],
            'preferred_doctor_id' => ['nullable', 'ulid', 'exists:doctor_profiles,id'],
            'consent' => ['accepted'],
            'specialty_id' => ['nullable', 'ulid', Rule::exists('specialties', 'id')->where('is_active', true)],
            'description' => ['required', 'string', 'min:10', 'max:1000'],
            'consultation_type' => ['required', 'in:online,in_person'],
            'governorate_id' => ['required', 'ulid', 'exists:governorates,id'],
            'city_id' => ['nullable', 'ulid', $this->cityOfGovernorate()],
            'area_id' => ['nullable', 'ulid', $this->areaOfCity()],
            'location_details' => ['nullable', 'required_if:consultation_type,in_person', 'string', 'max:500'],
            'contact_phone' => ['required', 'string', 'regex:'.Phone::EGYPT_MOBILE],
        ];
    }
}
