<?php

namespace App\Http\Resources;

use App\Models\UrgentRequestMessage;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A message in an urgent request thread, from the requesting user's point of view.
 * Expects `urgentRequest.patientProfile` to be loaded (UrgentMessages sets it).
 *
 * @mixin UrgentRequestMessage
 */
class UrgentMessageResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'body' => $this->body,
            'sender' => $this->sender_user_id === $this->urgentRequest->patientProfile->user_id ? 'patient' : 'doctor',
            'mine' => $this->sender_user_id === $request->user()?->getKey(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
