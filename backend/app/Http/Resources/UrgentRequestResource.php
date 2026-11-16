<?php

namespace App\Http\Resources;

use App\Models\UrgentRequest;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Viewer-aware urgent request. Visibility tiers:
 *  - patient owner / admin: everything about their request (+ accepted doctor contact after acceptance)
 *  - accepted doctor: patient name, contact phone, location details (needed for the consultation)
 *  - dispatched-but-not-accepted doctor: REDACTED — no name, phone, exact location (SRS §13.10)
 * Set ->viewerRole('patient'|'admin'|'accepted_doctor'|'dispatched_doctor') before resolving.
 *
 * @mixin UrgentRequest
 */
class UrgentRequestResource extends JsonResource
{
    /** Relations this resource reads: eager-load them wherever urgent requests are listed or returned. */
    public const RELATIONS = ['specialty', 'governorate', 'city', 'area', 'patientProfile.user', 'acceptedDoctor.user', 'preferredDoctor.user'];

    /** Admin views also summarise every dispatch. */
    public const ADMIN_RELATIONS = [...self::RELATIONS, 'dispatches'];

    private string $viewer = 'dispatched_doctor';

    public function viewerRole(string $role): static
    {
        $this->viewer = $role;

        return $this;
    }

    public function toArray(Request $request): array
    {
        $full = in_array($this->viewer, ['patient', 'admin', 'accepted_doctor'], true);
        $place = fn ($m) => $m ? ['id' => $m->id, 'name_ar' => $m->name_ar, 'name_en' => $m->name_en] : null;

        // Doctor viewers get the request with only their own dispatch loaded.
        $withMyDispatch = str_contains($this->viewer, 'doctor') && $this->relationLoaded('dispatches');
        $myDispatch = $withMyDispatch ? $this->dispatches->first() : null;

        return [
            'id' => $this->id,
            'status' => $this->status->value,
            'severity' => $this->severity->value,
            'current_tier' => $this->current_tier,
            'gp_disclosure' => $this->gp_disclosure,
            'consultation_type' => $this->consultation_type,
            'description' => $this->description,
            'specialty' => $this->specialty ? $place($this->specialty) : null,
            'governorate' => $place($this->governorate),
            'city' => $place($this->city),
            // Area is precise enough to identify a neighbourhood: only after acceptance.
            'area' => $full ? $place($this->area) : null,
            'location_details' => $full ? $this->location_details : null,
            'patient' => $full ? [
                'name' => $this->patientProfile?->user?->name,
                'contact_phone' => $this->viewer === 'patient' ? $this->contact_phone : ($this->contact_phone ?? $this->patientProfile?->user?->phone),
            ] : null,
            'accepted_doctor' => $this->acceptedDoctor ? [
                'id' => $this->acceptedDoctor->id,
                'name' => $this->acceptedDoctor->user?->name,
                'title_ar' => $this->acceptedDoctor->title_ar,
                'title_en' => $this->acceptedDoctor->title_en,
                // Contact is revealed to the patient only once a doctor has accepted.
                'phone' => in_array($this->viewer, ['patient', 'admin'], true) ? $this->acceptedDoctor->user?->phone : null,
            ] : null,
            'preferred_doctor' => $full && $this->preferredDoctor
                ? ['id' => $this->preferredDoctor->id, 'name' => $this->preferredDoctor->user->name] : null,
            // Private to the patient, the accepted doctor and admins.
            'outcome_note' => $full ? $this->outcome_note : null,
            'accepted_at' => $this->accepted_at?->toIso8601String(),
            'time_to_accept_seconds' => $this->timeToAcceptSeconds(),
            'waiting_seconds' => $this->status->isMatching() && $this->created_at
                ? (int) $this->created_at->diffInSeconds(now(), true) : null,
            // Only the two participants have a thread; everyone else always sees 0.
            'unread_messages' => in_array($this->viewer, ['patient', 'accepted_doctor'], true)
                ? (int) $this->getAttribute('unread_messages_count') : 0,
            'started_at' => $this->started_at?->toIso8601String(),
            'closed_at' => $this->closed_at?->toIso8601String(),
            'close_reason' => $full ? $this->close_reason : null,
            'expires_at' => $this->expires_at?->toIso8601String(),
            // While waiting for a doctor to become available: the request is kept open until then.
            'keep_open_until' => $this->keep_open_until?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'my_dispatch_status' => $this->when($withMyDispatch, fn () => $myDispatch?->status),
            'directed_to_me' => $this->when($withMyDispatch, fn () => $myDispatch?->tier === 0),
            'flagged' => $this->viewer === 'admin' ? ['at' => $this->flagged_at?->toIso8601String(), 'reason' => $this->flag_reason] : null,
            'dispatch_summary' => $this->when($this->viewer === 'admin' && $this->relationLoaded('dispatches'),
                fn () => $this->dispatches->groupBy('status')->map->count()),
        ];
    }
}
