<?php

namespace App\Actions\Auth;

use App\Enums\RoleName;
use App\Models\Consent;
use App\Models\DoctorProfile;
use App\Models\PatientProfile;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Support\Facades\DB;

/**
 * Every account gets the global patient role/profile (one global patient account).
 * Doctor sign-ups additionally get the doctor role and a draft (unverified) doctor profile.
 */
final class RegisterUser
{
    /** @param array{name:string,email:string,phone?:?string,password:string,account_type:string,locale?:?string} $data */
    public function handle(array $data, ?string $ip = null): User
    {
        $user = DB::transaction(function () use ($data, $ip) {
            $user = User::create([
                'name' => $data['name'],
                'email' => mb_strtolower($data['email']),
                'phone' => $data['phone'] ?? null,
                'password' => $data['password'],
                'locale' => $data['locale'] ?? 'ar',
            ]);

            $user->assignRole(RoleName::Patient);
            PatientProfile::create(['user_id' => $user->id]);

            if ($data['account_type'] === RoleName::Doctor->value) {
                $user->assignRole(RoleName::Doctor);
                DoctorProfile::create(['user_id' => $user->id]);
            }

            Consent::create([
                'user_id' => $user->id,
                'type' => 'terms',
                'granted' => true,
                'granted_at' => now(),
                'ip_address' => $ip,
            ]);

            return $user;
        });

        // Sends the verification email (queued mail channel) after commit.
        event(new Registered($user));

        return $user;
    }
}
