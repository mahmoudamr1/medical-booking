<?php

namespace App\Actions\Clinics;

use App\Enums\ClinicRole;
use App\Enums\MembershipStatus;
use App\Models\Clinic;
use App\Models\ClinicMembership;
use App\Models\User;
use App\Support\Slug;
use Illuminate\Support\Facades\DB;

final class CreateClinic
{
    /** @param array<string, mixed> $data */
    public function handle(User $owner, array $data, bool $personalPractice = false): Clinic
    {
        return DB::transaction(function () use ($owner, $data, $personalPractice) {
            $clinic = Clinic::create([
                'owner_user_id' => $owner->id,
                'slug' => Slug::unique('clinics', $data['name_en'] ?? $data['name_ar']),
                'name_ar' => $data['name_ar'],
                'name_en' => $data['name_en'] ?? $data['name_ar'],
                'description_ar' => $data['description_ar'] ?? null,
                'description_en' => $data['description_en'] ?? null,
                'phone' => $data['phone'] ?? null,
                'email' => $data['email'] ?? null,
                'is_personal_practice' => $personalPractice,
            ]);

            ClinicMembership::create([
                'clinic_id' => $clinic->id,
                'user_id' => $owner->id,
                'role' => ClinicRole::Owner,
                'status' => MembershipStatus::Active,
                'joined_at' => now(),
            ]);

            return $clinic;
        });
    }
}
