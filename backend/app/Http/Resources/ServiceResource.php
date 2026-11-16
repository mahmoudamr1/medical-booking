<?php

namespace App\Http\Resources;

use App\Models\MedicalService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin MedicalService */
class ServiceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'doctor_id' => $this->doctor_profile_id,
            'name_ar' => $this->name_ar,
            'name_en' => $this->name_en,
            'consultation_type' => $this->consultation_type->value,
            'duration_minutes' => $this->duration_minutes,
            'price' => (float) $this->price,
            'currency' => 'EGP',
            'is_active' => $this->is_active,
            'branch' => new BranchResource($this->whenLoaded('branch')),
        ];
    }
}
