<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;

/** Public doctor profile. Extends the card with biography, branches and services. */
class DoctorPublicResource extends DoctorCardResource
{
    public function toArray(Request $request): array
    {
        return parent::toArray($request) + [
            'bio_ar' => $this->bio_ar,
            'bio_en' => $this->bio_en,
            'qualifications' => $this->qualifications,
            'booking_mode' => $this->booking_mode->value,
            'min_cancellation_hours' => $this->min_cancellation_hours,
            'timezone' => $this->timezone,
            'branches' => BranchResource::collection($this->whenLoaded('branches')),
            'services' => ServiceResource::collection($this->whenLoaded('services',
                fn () => $this->services->where('is_active', true)->values())),
        ];
    }
}
