<?php

namespace App\Models;

use App\Enums\UrgentSeverity;
use App\Enums\UrgentStatus;
use Closure;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Live urgent consultation request: a patient asking to be connected with a doctor available right now.
 * Separate from appointments. Status changes happen only in App\Actions\Urgent\* and
 * App\Services\Urgent\UrgentDispatcher (conditional updates under locks).
 */
class UrgentRequest extends Model
{
    use HasUlids;

    /** Tabs of a doctor's urgent inbox (GET /doctor/urgent-requests?status=…). */
    public const DOCTOR_TABS = ['open', 'accepted', 'closed'];

    /** Read-marker column per participant side (id of the last message that side has fetched). */
    public const READ_MARKER = ['patient' => 'patient_read_message_id', 'doctor' => 'doctor_read_message_id'];

    protected $guarded = ['id', 'status', 'accepted_doctor_profile_id', 'accepted_at', 'closed_at', 'outcome_note',
        'patient_read_message_id', 'doctor_read_message_id', 'keep_open_until'];

    /** Never serialized by accident; resources decide what each viewer may see. */
    protected $hidden = ['location_details', 'contact_phone', 'outcome_note'];

    protected function casts(): array
    {
        return [
            'status' => UrgentStatus::class,
            'severity' => UrgentSeverity::class,
            'gp_disclosure' => 'boolean',
            'disclaimer_acknowledged_at' => 'immutable_datetime',
            'accepted_at' => 'immutable_datetime',
            'started_at' => 'immutable_datetime',
            'closed_at' => 'immutable_datetime',
            'expires_at' => 'immutable_datetime',
            'keep_open_until' => 'immutable_datetime',
            'flagged_at' => 'immutable_datetime',
            'current_tier' => 'integer',
            'patient_read_message_id' => 'integer',
            'doctor_read_message_id' => 'integer',
        ];
    }

    /**
     * withCount()/loadCount() definition of `unread_messages_count`: messages from the other party
     * newer than the viewer's read marker.
     *
     * @param  'patient'|'doctor'  $side
     * @return array<string, Closure(Builder<UrgentRequestMessage>): void>
     */
    public static function unreadMessagesCount(string $viewerUserId, string $side): array
    {
        $marker = self::READ_MARKER[$side];

        return ['messages as unread_messages_count' => function (Builder $q) use ($viewerUserId, $marker): void {
            $q->where('sender_user_id', '<>', $viewerUserId)
                ->whereRaw("urgent_request_messages.id > coalesce(urgent_requests.{$marker}, 0)");
        }];
    }

    /**
     * Requests dispatched to this doctor, optionally narrowed to one inbox tab: open = still matching and
     * awaiting this doctor's answer; accepted = this doctor's active consultations; closed = finished.
     *
     * @param  Builder<UrgentRequest>  $query
     * @return Builder<UrgentRequest>
     */
    public function scopeDispatchedTo(Builder $query, string $doctorId, ?string $tab = null): Builder
    {
        $query->whereHas('dispatches', fn (Builder $q) => $q->where('doctor_profile_id', $doctorId));

        return match ($tab) {
            'open' => $query->whereIn('status', UrgentStatus::MATCHING)
                ->whereHas('dispatches', fn (Builder $q) => $q->where('doctor_profile_id', $doctorId)->where('status', 'notified')),
            'accepted' => $query->where('accepted_doctor_profile_id', $doctorId)->whereIn('status', UrgentStatus::ACTIVE_WITH_DOCTOR),
            'closed' => $query->whereIn('status', ['completed', 'cancelled', 'unmatched', 'expired']),
            default => $query,
        };
    }

    /** @return BelongsTo<PatientProfile, $this> */
    public function patientProfile(): BelongsTo
    {
        return $this->belongsTo(PatientProfile::class);
    }

    /** @return BelongsTo<Specialty, $this> */
    public function specialty(): BelongsTo
    {
        return $this->belongsTo(Specialty::class);
    }

    /** @return BelongsTo<Governorate, $this> */
    public function governorate(): BelongsTo
    {
        return $this->belongsTo(Governorate::class);
    }

    /** @return BelongsTo<City, $this> */
    public function city(): BelongsTo
    {
        return $this->belongsTo(City::class);
    }

    /** @return BelongsTo<Area, $this> */
    public function area(): BelongsTo
    {
        return $this->belongsTo(Area::class);
    }

    /** @return BelongsTo<DoctorProfile, $this> */
    public function acceptedDoctor(): BelongsTo
    {
        return $this->belongsTo(DoctorProfile::class, 'accepted_doctor_profile_id');
    }

    /**
     * The doctor the patient asked for directly (tier 0), if any.
     *
     * @return BelongsTo<DoctorProfile, $this>
     */
    public function preferredDoctor(): BelongsTo
    {
        return $this->belongsTo(DoctorProfile::class, 'preferred_doctor_profile_id');
    }

    /** @return HasMany<UrgentRequestDispatch, $this> */
    public function dispatches(): HasMany
    {
        return $this->hasMany(UrgentRequestDispatch::class);
    }

    /** @return HasMany<UrgentRequestMessage, $this> */
    public function messages(): HasMany
    {
        return $this->hasMany(UrgentRequestMessage::class);
    }

    /** Nobody has accepted yet but the request may still wait for a doctor to become available. */
    public function canKeepOpen(): bool
    {
        return $this->keep_open_until !== null && $this->keep_open_until->isFuture();
    }

    /** Seconds from submission to acceptance; null while nobody has accepted. */
    public function timeToAcceptSeconds(): ?int
    {
        return $this->accepted_at && $this->created_at
            ? (int) $this->created_at->diffInSeconds($this->accepted_at, true)
            : null;
    }
}
