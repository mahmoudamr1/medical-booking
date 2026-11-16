<?php

namespace Database\Factories;

use App\Enums\ClinicRole;
use App\Models\Clinic;
use App\Models\ClinicMembership;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/** @extends Factory<Clinic> */
class ClinicFactory extends Factory
{
    public function definition(): array
    {
        $name = fake()->unique()->company();

        return [
            'owner_user_id' => User::factory(),
            'slug' => Str::slug($name).'-'.Str::lower(Str::random(5)),
            'name_ar' => 'عيادة '.$name,
            'name_en' => $name.' Clinic',
            'phone' => '0100'.fake()->numerify('#######'),
        ];
    }

    /** Owner automatically gets an active owner membership. */
    public function configure(): static
    {
        return $this->afterCreating(function (Clinic $clinic) {
            ClinicMembership::firstOrCreate(
                ['clinic_id' => $clinic->id, 'user_id' => $clinic->owner_user_id],
                ['role' => ClinicRole::Owner, 'status' => 'active', 'joined_at' => now()],
            );
        });
    }
}
