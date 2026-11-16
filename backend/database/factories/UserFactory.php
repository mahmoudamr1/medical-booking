<?php

namespace Database\Factories;

use App\Enums\RoleName;
use App\Enums\UserStatus;
use App\Models\PatientProfile;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/** @extends Factory<User> */
class UserFactory extends Factory
{
    protected static ?string $password;

    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->userName().'@example.test',
            'phone' => null,
            'locale' => 'ar',
            'status' => UserStatus::Active,
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password'),
            'remember_token' => Str::random(10),
        ];
    }

    public function unverified(): static
    {
        return $this->state(fn () => ['email_verified_at' => null]);
    }

    public function suspended(): static
    {
        return $this->state(fn () => ['status' => UserStatus::Suspended]);
    }

    public function patient(): static
    {
        return $this->afterCreating(function (User $user) {
            $user->assignRole(RoleName::Patient);
            PatientProfile::firstOrCreate(['user_id' => $user->id]);
        });
    }

    public function admin(): static
    {
        return $this->afterCreating(fn (User $user) => $user->assignRole(RoleName::Admin));
    }
}
