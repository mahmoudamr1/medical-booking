<?php

namespace App\Http\Resources;

use App\Models\Clinic;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Organization details as seen by its own members.
 *
 * @mixin Clinic
 */
class ClinicManageResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'name_ar' => $this->name_ar,
            'name_en' => $this->name_en,
            'description_ar' => $this->description_ar,
            'description_en' => $this->description_en,
            'phone' => $this->phone,
            'email' => $this->email,
            'status' => $this->status->value,
            'type' => $this->type,
            'is_personal_practice' => $this->is_personal_practice,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
