<?php

namespace App\Actions\Clinics;

use App\Enums\RoleName;
use App\Models\PatientProfile;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Patient for a booking made by clinic staff: the existing account with that email, or a new
 * patient account. A new patient sets their own password through the reset flow; staff never see it.
 */
final class FindOrInvitePatient
{
    /** @throws ValidationException when a new account is needed but the name is missing or the phone is taken */
    public function handle(string $email, ?string $name, ?string $phone): PatientProfile
    {
        return DB::transaction(function () use ($email, $name, $phone) {
            $email = mb_strtolower($email);
            $user = User::where('email', $email)->first() ?? $this->invite($email, $name, $phone);

            return PatientProfile::forUser($user);
        });
    }

    private function invite(string $email, ?string $name, ?string $phone): User
    {
        validator(['patient_name' => $name, 'patient_phone' => $phone],
            ['patient_name' => 'required', 'patient_phone' => 'nullable|unique:users,phone'])->validate();

        $user = User::create(['name' => $name, 'email' => $email, 'phone' => $phone, 'password' => Str::password(32)]);
        $user->assignRole(RoleName::Patient);
        Password::sendResetLink(['email' => $email]);

        return $user;
    }
}
