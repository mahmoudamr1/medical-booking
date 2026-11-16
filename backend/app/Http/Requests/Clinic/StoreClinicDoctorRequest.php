<?php

namespace App\Http\Requests\Clinic;

use Illuminate\Foundation\Http\FormRequest;

class StoreClinicDoctorRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'doctor_email' => ['required', 'email'],
            'clinic_branch_id' => ['required', 'ulid'],
        ];
    }
}
