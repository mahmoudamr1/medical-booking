<?php

namespace App\Models;

use App\Enums\AppointmentStatus;
use App\Enums\ConsultationType;
use DateTimeInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * Status changes go through App\Actions\Booking\TransitionAppointment only (records history,
 * checks the transition table and the actor's rights). Never update `status` directly.
 */
class Appointment extends Model
{
    use HasUlids;

    protected $guarded = ['id', 'status', 'cancelled_at', 'cancelled_by_user_id', 'confirmed_at', 'completed_at'];

    protected function casts(): array
    {
        return [
            'status' => AppointmentStatus::class,
            'consultation_type' => ConsultationType::class,
            'starts_at' => 'immutable_datetime',
            'ends_at' => 'immutable_datetime',
            'blocked_until' => 'immutable_datetime',
            'hold_expires_at' => 'immutable_datetime',
            'cancelled_at' => 'immutable_datetime',
            'confirmed_at' => 'immutable_datetime',
            'completed_at' => 'immutable_datetime',
            'reminded_at' => 'immutable_datetime',
            'price' => 'decimal:2',
        ];
    }

    /** @return BelongsTo<DoctorProfile, $this> */
    public function doctorProfile(): BelongsTo
    {
        return $this->belongsTo(DoctorProfile::class);
    }

    /** @return BelongsTo<PatientProfile, $this> */
    public function patientProfile(): BelongsTo
    {
        return $this->belongsTo(PatientProfile::class);
    }

    /** @return BelongsTo<MedicalService, $this> */
    public function service(): BelongsTo
    {
        return $this->belongsTo(MedicalService::class, 'medical_service_id');
    }

    /** @return BelongsTo<ClinicBranch, $this> */
    public function branch(): BelongsTo
    {
        return $this->belongsTo(ClinicBranch::class, 'clinic_branch_id');
    }

    /** @return BelongsTo<Clinic, $this> */
    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class);
    }

    /** @return HasMany<AppointmentStatusHistory, $this> */
    public function histories(): HasMany
    {
        return $this->hasMany(AppointmentStatusHistory::class)->orderBy('created_at')->orderBy('id');
    }

    /** @return HasOne<Review, $this> */
    public function review(): HasOne
    {
        return $this->hasOne(Review::class);
    }

    /** @return BelongsTo<Appointment, $this> */
    public function rescheduledFrom(): BelongsTo
    {
        return $this->belongsTo(self::class, 'rescheduled_from_id');
    }

    /**
     * @param  Builder<Appointment>  $query
     * @return Builder<Appointment>
     */
    public function scopeBlocking(Builder $query): Builder
    {
        return $query->whereIn('status', AppointmentStatus::BLOCKING);
    }

    /**
     * Appointments whose blocked period intersects [from, to).
     *
     * @param  Builder<Appointment>  $query
     * @return Builder<Appointment>
     */
    public function scopeOverlapping(Builder $query, DateTimeInterface $from, DateTimeInterface $to): Builder
    {
        return $query->where('starts_at', '<', $to)->where('blocked_until', '>', $from);
    }
}
