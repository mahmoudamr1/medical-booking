<?php

namespace App\Http\Resources;

use App\Models\Specialty;
use Illuminate\Database\Eloquent\Relations\Pivot;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Specialty
 *
 * @property-read Pivot $pivot set by Eloquent when the specialty is loaded through a many-to-many relation
 */
class SpecialtyResource extends JsonResource
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
            'icon' => $this->icon,
            'is_general_practice' => $this->is_general_practice,
            'is_primary' => $this->whenPivotLoaded('doctor_specialties', fn () => (bool) $this->pivot->getAttribute('is_primary')),
            'doctors_count' => $this->whenCounted('doctors'),
            // Admin-only fields are added by the admin resource.
        ];
    }
}
