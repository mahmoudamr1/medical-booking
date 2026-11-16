<?php

namespace App\Http\Resources;

use App\Enums\MembershipStatus;
use App\Models\ClinicMembership;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The signed-in user's own account (never used for other users).
 *
 * @mixin User
 */
class CurrentUserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $this->resource->loadMissing(['roles', 'patientProfile', 'doctorProfile.volunteerProfile', 'clinicMemberships.clinic']);
        $doctor = $this->doctorProfile;

        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'locale' => $this->locale,
            'email_verified' => $this->email_verified_at !== null,
            'roles' => $this->roles->pluck('name')->values(),
            'permissions' => $this->permissionNames(),
            'patient_profile_id' => $this->patientProfile?->id,
            'doctor_profile' => $doctor ? [
                'id' => $doctor->id,
                'verification_status' => $doctor->verification_status->value,
                'is_active' => $doctor->is_active,
                'volunteer_active' => $doctor->volunteerProfile?->status === 'active',
            ] : null,
            'clinics' => $this->clinicMemberships
                ->filter(fn (ClinicMembership $m) => $m->status === MembershipStatus::Active)
                ->map(fn (ClinicMembership $m) => [
                    'id' => $m->clinic_id,
                    'slug' => $m->clinic->slug,
                    'name_ar' => $m->clinic->name_ar,
                    'name_en' => $m->clinic->name_en,
                    'role' => $m->role->value,
                    'permissions' => array_map(fn ($p) => $p->value, $m->role->permissions()),
                ])->values(),
        ];
    }
}
