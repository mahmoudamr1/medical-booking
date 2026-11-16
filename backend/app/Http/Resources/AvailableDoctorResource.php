<?php

namespace App\Http\Resources;

use App\Models\DoctorProfile;
use App\Models\VolunteerAvailability;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A doctor taking urgent consultations right now: public fields only (no contact, no license).
 * Expects VolunteerMatcher::withLiveDetails() (current windows only + `urgent_active`).
 *
 * @mixin DoctorProfile
 */
class AvailableDoctorResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $volunteer = $this->volunteerProfile;
        $windows = $volunteer !== null ? $volunteer->availabilities : collect();
        $modes = array_values(array_filter(['online', 'in_person'], fn (string $mode) => $volunteer !== null
            && ($mode === 'online' ? $volunteer->accepts_online : $volunteer->accepts_in_person)
            && $windows->contains(fn (VolunteerAvailability $w) => in_array($w->mode, [$mode, 'both'], true))));
        $coverage = $volunteer?->locations->first();
        $place = $coverage !== null ? ($coverage->city ?? $coverage->governorate) : null;

        return [
            'id' => $this->id,
            'name' => $this->user->name,
            'title_ar' => $this->title_ar,
            'title_en' => $this->title_en,
            'avatar_url' => $this->avatarUrl(),
            'rating_avg' => (float) $this->rating_avg,
            'rating_count' => (int) $this->rating_count,
            'specialties' => $volunteer !== null
                ? $volunteer->specialties->map->only(['id', 'slug', 'name_ar', 'name_en'])->values()->all()
                : [],
            'modes' => $modes,
            'city' => $place !== null ? ['name_ar' => $place->name_ar, 'name_en' => $place->name_en] : null,
            'available_until' => $windows->sortByDesc('ends_at')->first()?->ends_at->toIso8601String(),
            'load' => [
                'active' => (int) $this->getAttribute('urgent_active'),
                'max' => $volunteer->max_concurrent_requests ?? 1,
            ],
        ];
    }
}
