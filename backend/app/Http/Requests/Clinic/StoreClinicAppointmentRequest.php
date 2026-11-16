<?php

namespace App\Http\Requests\Clinic;

use App\Models\Clinic;
use App\Support\Phone;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** Reception booking on behalf of a patient; the service must belong to this clinic. */
class StoreClinicAppointmentRequest extends FormRequest
{
    public function rules(): array
    {
        /** @var Clinic $clinic set by ResolveClinicTenant */
        $clinic = $this->route('clinic');

        return [
            'doctor_id' => ['required', 'ulid'],
            'service_id' => ['required', 'ulid', Rule::exists('medical_services', 'id')->where('clinic_id', $clinic->id)],
            'starts_at' => ['required', 'date', 'after:now'],
            'patient_email' => ['required', 'email'],
            'patient_name' => ['nullable', 'string', 'min:3', 'max:120'],
            'patient_phone' => ['nullable', 'string', 'regex:'.Phone::EGYPT_MOBILE],
            'notes' => ['nullable', 'string', 'max:500'],
        ];
    }
}
