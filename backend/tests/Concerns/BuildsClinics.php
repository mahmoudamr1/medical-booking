<?php

namespace Tests\Concerns;

use App\Enums\ClinicRole;
use App\Enums\MembershipStatus;
use App\Models\Clinic;
use App\Models\ClinicMembership;
use App\Models\User;

/** Fixtures for clinic (tenant) staff. */
trait BuildsClinics
{
    /** A user holding $role in $clinic; only an active membership grants access. */
    protected function clinicMember(Clinic $clinic, ClinicRole $role, MembershipStatus $status = MembershipStatus::Active): User
    {
        $user = User::factory()->create();
        ClinicMembership::create([
            'clinic_id' => $clinic->id, 'user_id' => $user->id, 'role' => $role, 'status' => $status, 'joined_at' => now(),
        ]);

        return $user;
    }
}
