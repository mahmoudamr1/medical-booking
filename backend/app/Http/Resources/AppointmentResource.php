<?php

namespace App\Http\Resources;

use App\Models\Appointment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Appointment as seen by an authorized participant (patient, doctor, clinic staff, admin).
 * Patient contact details are included only for the treating side (doctor/clinic/admin),
 * never for unrelated parties — access itself is enforced by AppointmentPolicy.
 *
 * @mixin Appointment
 */
class AppointmentResource extends JsonResource
{
    /** Relations this resource reads: eager-load them wherever appointments are listed or returned. */
    public const RELATIONS = ['doctorProfile.user', 'doctorProfile.specialties', 'patientProfile.user', 'service', 'branch.city', 'branch.clinic', 'review'];

    /** Single-appointment view: RELATIONS plus the status history. */
    public const DETAIL_RELATIONS = [...self::RELATIONS, 'histories'];

    public function toArray(Request $request): array
    {
        $viewer = $request->user();
        $isPatientViewer = $viewer && $this->patientProfile?->user_id === $viewer->id;
        $doctor = $this->doctorProfile;

        return [
            'id' => $this->id,
            'reference' => $this->reference,
            'status' => $this->status->value,
            'group' => $this->status->group(),
            'consultation_type' => $this->consultation_type->value,
            'starts_at' => $this->starts_at->toIso8601String(),
            'ends_at' => $this->ends_at->toIso8601String(),
            'duration_minutes' => (int) $this->starts_at->diffInMinutes($this->ends_at),
            'timezone' => $doctor?->timezone,
            'price' => (float) $this->price,
            'currency' => 'EGP',
            'hold_expires_at' => $this->hold_expires_at?->toIso8601String(),
            'booked_via' => $this->booked_via,
            'patient_notes' => $this->patient_notes,
            'cancellation_reason' => $this->cancellation_reason,
            'cancelled_at' => $this->cancelled_at?->toIso8601String(),
            'confirmed_at' => $this->confirmed_at?->toIso8601String(),
            'completed_at' => $this->completed_at?->toIso8601String(),
            'rescheduled_from_id' => $this->rescheduled_from_id,
            'created_at' => $this->created_at?->toIso8601String(),
            'doctor' => $doctor ? [
                'id' => $doctor->id,
                'name' => $doctor->user?->name,
                'title_ar' => $doctor->title_ar,
                'title_en' => $doctor->title_en,
                'avatar_url' => $doctor->avatarUrl(),
                'min_cancellation_hours' => $doctor->min_cancellation_hours,
                'specialties' => $doctor->relationLoaded('specialties')
                    ? SpecialtyResource::collection($doctor->specialties)->resolve($request) : [],
            ] : null,
            'patient' => $this->whenLoaded('patientProfile', fn () => [
                'id' => $this->patientProfile->id,
                'name' => $this->patientProfile->user?->name,
                // Contact details only for the care side.
                'phone' => $isPatientViewer ? null : $this->patientProfile->user?->phone,
                'email' => $isPatientViewer ? null : $this->patientProfile->user?->email,
            ]),
            'service' => $this->whenLoaded('service', fn () => [
                'id' => $this->service->id,
                'name_ar' => $this->service->name_ar,
                'name_en' => $this->service->name_en,
            ]),
            'branch' => new BranchResource($this->whenLoaded('branch')),
            // The patient's own review of this visit (only the patient sees it here).
            'review' => $this->when($isPatientViewer, fn () => $this->relationLoaded('review') && $this->review
                ? ['rating' => $this->review->rating, 'comment' => $this->review->comment] : null),
            'can' => $viewer ? [
                'cancel' => $this->status->isBlocking() && $this->starts_at->isFuture(),
                'reschedule' => $isPatientViewer && $this->status->isBlocking() && $this->starts_at->isFuture(),
                'review' => $isPatientViewer && $this->status->value === 'completed'
                    && ! ($this->relationLoaded('review') && $this->review),
            ] : null,
            'history' => $this->whenLoaded('histories', fn () => $this->histories->map(fn ($h) => [
                'from' => $h->from_status?->value,
                'to' => $h->to_status->value,
                'actor_role' => $h->actor_role->value,
                'reason' => $h->reason,
                'at' => $h->created_at->toIso8601String(),
            ])),
        ];
    }
}
