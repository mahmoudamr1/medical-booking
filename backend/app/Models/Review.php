<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Review extends Model
{
    use HasUlids;

    protected $attributes = ['status' => 'published'];

    protected $fillable = ['appointment_id', 'doctor_profile_id', 'patient_profile_id', 'rating', 'comment'];

    protected function casts(): array
    {
        return ['rating' => 'integer', 'moderated_at' => 'datetime'];
    }

    /** @return BelongsTo<Appointment, $this> */
    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class);
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

    /** @return HasMany<ReviewReport, $this> */
    public function reports(): HasMany
    {
        return $this->hasMany(ReviewReport::class);
    }
}
