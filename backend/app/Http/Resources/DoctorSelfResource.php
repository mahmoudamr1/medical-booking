<?php

namespace App\Http\Resources;

use App\Models\DoctorProfile;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A doctor's own full profile, including private verification fields. Owner/admin only.
 *
 * @mixin DoctorProfile
 */
class DoctorSelfResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->user->name,
            'email' => $this->user->email,
            'title_ar' => $this->title_ar,
            'title_en' => $this->title_en,
            'bio_ar' => $this->bio_ar,
            'bio_en' => $this->bio_en,
            'qualifications' => $this->qualifications,
            'years_experience' => $this->years_experience,
            'gender' => $this->gender,
            'avatar_url' => $this->avatarUrl(),
            'license_number' => $this->license_number,
            'verification_status' => $this->verification_status->value,
            'verification_notes' => $this->verification_notes,
            'verification_submitted_at' => $this->verification_submitted_at?->toIso8601String(),
            'verified_at' => $this->verified_at?->toIso8601String(),
            'is_active' => $this->is_active,
            'preferences' => [
                'accepts_bookings' => $this->accepts_bookings,
                'booking_mode' => $this->booking_mode->value,
                'min_cancellation_hours' => $this->min_cancellation_hours,
                'lead_time_minutes' => $this->lead_time_minutes,
                'horizon_days' => $this->horizon_days,
                'buffer_minutes' => $this->buffer_minutes,
                'timezone' => $this->timezone,
            ],
            'rating_avg' => (float) $this->rating_avg,
            'rating_count' => $this->rating_count,
            'specialties' => SpecialtyResource::collection($this->whenLoaded('specialties')),
            'documents' => DoctorDocumentResource::collection($this->whenLoaded('documents')),
            'branches' => BranchResource::collection($this->whenLoaded('branches')),
        ];
    }
}
