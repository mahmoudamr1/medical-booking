<?php

namespace App\Http\Resources;

use App\Models\DoctorDocument;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Metadata only; the file is streamed through an authorized download endpoint, never a public URL.
 *
 * @mixin DoctorDocument
 */
class DoctorDocumentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type->value,
            'original_name' => $this->original_name,
            'mime' => $this->mime,
            'size' => $this->size,
            'uploaded_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
