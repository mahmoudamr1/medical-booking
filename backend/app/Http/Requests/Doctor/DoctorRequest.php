<?php

namespace App\Http\Requests\Doctor;

use App\Models\DoctorProfile;
use Illuminate\Foundation\Http\FormRequest;

/** Base for /doctor/* payloads: exposes the caller's own doctor profile (resolved once per request). */
abstract class DoctorRequest extends FormRequest
{
    private ?DoctorProfile $doctorProfile = null;

    public function doctor(): DoctorProfile
    {
        return $this->doctorProfile ??= DoctorProfile::forUser($this->user());
    }
}
