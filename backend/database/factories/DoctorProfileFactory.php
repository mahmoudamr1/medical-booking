<?php

namespace Database\Factories;

use App\Enums\RoleName;
use App\Enums\VerificationStatus;
use App\Models\DoctorProfile;
use App\Models\PatientProfile;
use App\Models\Specialty;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<DoctorProfile> */
class DoctorProfileFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'title_ar' => 'أخصائي',
            'title_en' => 'Specialist',
            'bio_ar' => 'نبذة تجريبية',
            'bio_en' => 'Synthetic biography',
            'years_experience' => fake()->numberBetween(1, 30),
            'license_number' => 'LIC-'.fake()->unique()->numerify('######'),
            'timezone' => 'Africa/Cairo',
            'lead_time_minutes' => 0,
        ];
    }

    public function configure(): static
    {
        return $this->afterCreating(function (DoctorProfile $doctor) {
            $doctor->user->assignRole(RoleName::Doctor);
            $doctor->user->assignRole(RoleName::Patient);
            PatientProfile::firstOrCreate(['user_id' => $doctor->user_id]);
        });
    }

    public function verified(): static
    {
        return $this->state(fn () => [])->afterCreating(function (DoctorProfile $doctor) {
            $doctor->forceFill([
                'verification_status' => VerificationStatus::Approved,
                'verified_at' => now(),
            ])->save();
        });
    }

    public function pending(): static
    {
        return $this->afterCreating(fn (DoctorProfile $d) => $d->forceFill([
            'verification_status' => VerificationStatus::Pending,
            'verification_submitted_at' => now(),
        ])->save());
    }

    public function withSpecialty(?Specialty $specialty = null): static
    {
        return $this->afterCreating(function (DoctorProfile $doctor) use ($specialty) {
            $doctor->specialties()->attach(($specialty ?? Specialty::factory()->create())->id, ['is_primary' => true]);
        });
    }
}
