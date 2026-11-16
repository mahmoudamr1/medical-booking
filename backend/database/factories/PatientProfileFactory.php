<?php

namespace Database\Factories;

use App\Enums\RoleName;
use App\Models\PatientProfile;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<PatientProfile> */
class PatientProfileFactory extends Factory
{
    public function definition(): array
    {
        return ['user_id' => User::factory()];
    }

    public function configure(): static
    {
        return $this->afterCreating(fn (PatientProfile $p) => $p->user->assignRole(RoleName::Patient));
    }
}
