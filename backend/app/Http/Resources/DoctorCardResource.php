<?php

namespace App\Http\Resources;

use App\Models\DoctorProfile;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Public doctor summary for listings. Contains no private verification data
 * (license number, documents, notes) — only fields safe for anyone to see.
 *
 * @mixin DoctorProfile
 */
class DoctorCardResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $primaryBranch = $this->relationLoaded('branches') ? $this->branches->first() : null;

        return [
            'id' => $this->id,
            'name' => $this->user->name,
            'title_ar' => $this->title_ar,
            'title_en' => $this->title_en,
            'gender' => $this->gender,
            'avatar_url' => $this->avatarUrl(),
            'years_experience' => $this->years_experience,
            'rating_avg' => (float) $this->rating_avg,
            'rating_count' => $this->rating_count,
            'min_price' => $this->min_price !== null ? (float) $this->min_price : null,
            'currency' => 'EGP',
            'next_available_at' => $this->next_available_at?->toIso8601String(),
            'accepts_bookings' => $this->accepts_bookings,
            'verified' => true,
            'specialties' => SpecialtyResource::collection($this->whenLoaded('specialties')),
            'primary_branch' => $primaryBranch ? (new BranchResource($primaryBranch))->resolve($request) : null,
            'consultation_types' => $this->whenLoaded('services', fn () => $this->services
                ->where('is_active', true)->pluck('consultation_type')->map->value->unique()->values()),
        ];
    }
}
