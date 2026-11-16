<?php

namespace App\Models;

use App\Enums\AffiliationStatus;
use App\Enums\BookingMode;
use App\Enums\UserStatus;
use App\Enums\VerificationStatus;
use App\Services\Search\ArabicNormalizer;
use Database\Factories\DoctorProfileFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class DoctorProfile extends Model
{
    /** @use HasFactory<DoctorProfileFactory> */
    use HasFactory, HasUlids;

    protected $attributes = [
        'verification_status' => 'draft',
        'booking_mode' => 'instant',
        'is_active' => true,
        'accepts_bookings' => true,
        'min_cancellation_hours' => 12,
        'lead_time_minutes' => 60,
        'horizon_days' => 60,
        'buffer_minutes' => 0,
        'timezone' => 'Africa/Cairo',
        'rating_avg' => 0,
        'rating_count' => 0,
    ];

    protected $fillable = [
        'user_id', 'title_ar', 'title_en', 'bio_ar', 'bio_en', 'qualifications', 'years_experience',
        'gender', 'avatar_path', 'license_number', 'accepts_bookings', 'booking_mode',
        'min_cancellation_hours', 'lead_time_minutes', 'horizon_days', 'buffer_minutes', 'timezone',
    ];

    /** Never serialize private verification data by accident. */
    protected $hidden = ['license_number', 'verification_notes', 'search_text'];

    protected function casts(): array
    {
        return [
            'verification_status' => VerificationStatus::class,
            'booking_mode' => BookingMode::class,
            'is_active' => 'boolean',
            'accepts_bookings' => 'boolean',
            'verified_at' => 'datetime',
            'verification_submitted_at' => 'datetime',
            'next_available_at' => 'datetime',
            'rating_avg' => 'decimal:2',
            'min_price' => 'decimal:2',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (DoctorProfile $doctor) {
            $doctor->search_text = $doctor->buildSearchText();
        });
    }

    public function buildSearchText(): string
    {
        $user = $this->user ?? User::find($this->user_id);

        return ArabicNormalizer::normalize(implode(' ', array_filter([
            $user?->name, $this->title_ar, $this->title_en,
        ])));
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsToMany<Specialty, $this> */
    public function specialties(): BelongsToMany
    {
        return $this->belongsToMany(Specialty::class, 'doctor_specialties')->withPivot('is_primary');
    }

    /** @return HasMany<DoctorDocument, $this> */
    public function documents(): HasMany
    {
        return $this->hasMany(DoctorDocument::class);
    }

    /** @return HasMany<DoctorBranchAffiliation, $this> */
    public function affiliations(): HasMany
    {
        return $this->hasMany(DoctorBranchAffiliation::class);
    }

    /** @return BelongsToMany<ClinicBranch, $this> */
    public function branches(): BelongsToMany
    {
        return $this->belongsToMany(ClinicBranch::class, 'doctor_branch_affiliations')
            ->withPivot(['id', 'clinic_id', 'status'])
            ->wherePivot('status', AffiliationStatus::Active->value);
    }

    /** @return HasMany<MedicalService, $this> */
    public function services(): HasMany
    {
        return $this->hasMany(MedicalService::class);
    }

    /** @return HasOne<VolunteerProfile, $this> */
    public function volunteerProfile(): HasOne
    {
        return $this->hasOne(VolunteerProfile::class);
    }

    /** The signed-in doctor's own profile (404 when the account has none). */
    public static function forUser(User $user): self
    {
        return self::where('user_id', $user->id)->firstOrFail();
    }

    /** Public avatar URL (served by GET /doctors/{id}/avatar), or null when none is uploaded. */
    public function avatarUrl(): ?string
    {
        return $this->avatar_path ? route('public.doctor-avatar', $this->id, absolute: false) : null;
    }

    /** @return list<string> ids of the branches the doctor is actively affiliated with */
    public function activeBranchIds(): array
    {
        return $this->affiliations()->where('status', AffiliationStatus::Active->value)->pluck('clinic_branch_id')->all();
    }

    public function isVerified(): bool
    {
        return $this->verification_status === VerificationStatus::Approved;
    }

    /** Publicly discoverable and bookable: verified, active, and owner account active. */
    public function isPubliclyVisible(): bool
    {
        return $this->isVerified() && $this->is_active
            && ($this->user->status ?? UserStatus::Suspended) === UserStatus::Active;
    }

    /**
     * @param  Builder<DoctorProfile>  $query
     * @return Builder<DoctorProfile>
     */
    public function scopePubliclyVisible(Builder $query): Builder
    {
        return $query
            ->where('doctor_profiles.verification_status', VerificationStatus::Approved->value)
            ->where('doctor_profiles.is_active', true)
            ->whereHas('user', fn (Builder $q) => $q->where('status', UserStatus::Active->value));
    }
}
