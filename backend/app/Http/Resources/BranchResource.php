<?php

namespace App\Http\Resources;

use App\Models\ClinicBranch;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin ClinicBranch */
class BranchResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'clinic_id' => $this->clinic_id,
            'name_ar' => $this->name_ar,
            'name_en' => $this->name_en,
            'address_ar' => $this->address_ar,
            'address_en' => $this->address_en,
            'phone' => $this->phone,
            'latitude' => $this->latitude,
            'longitude' => $this->longitude,
            'is_active' => $this->is_active,
            'governorate' => new LocationResource($this->whenLoaded('governorate')),
            'city' => new LocationResource($this->whenLoaded('city')),
            'area' => new LocationResource($this->whenLoaded('area')),
            'clinic' => $this->whenLoaded('clinic', fn () => [
                'id' => $this->clinic->id,
                'slug' => $this->clinic->slug,
                'name_ar' => $this->clinic->name_ar,
                'name_en' => $this->clinic->name_en,
                'type' => $this->clinic->type,
                'is_personal_practice' => $this->clinic->is_personal_practice,
                'logo_url' => $this->clinic->logo_path ? route('public.clinic-logo', $this->clinic->slug, absolute: false) : null,
            ]),
            'hours' => $this->whenLoaded('hours', fn () => $this->hours->map(fn ($h) => [
                'day_of_week' => $h->day_of_week,
                'opens_at' => substr($h->opens_at, 0, 5),
                'closes_at' => substr($h->closes_at, 0, 5),
            ])),
        ];
    }
}
