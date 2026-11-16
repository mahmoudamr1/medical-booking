<?php

namespace Database\Factories;

use App\Enums\ConsultationType;
use App\Models\DoctorProfile;
use App\Models\MedicalService;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<MedicalService> Defaults to an online service (no branch). */
class MedicalServiceFactory extends Factory
{
    public function definition(): array
    {
        return [
            'doctor_profile_id' => DoctorProfile::factory(),
            'name_ar' => 'كشف',
            'name_en' => 'Consultation',
            'consultation_type' => ConsultationType::Online,
            'duration_minutes' => 20,
            'price' => 300,
            'is_active' => true,
        ];
    }
}
