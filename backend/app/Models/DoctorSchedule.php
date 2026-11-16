<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DoctorSchedule extends Model
{
    use HasUlids;

    protected $attributes = ['is_active' => true];

    protected $fillable = ['doctor_profile_id', 'clinic_branch_id', 'day_of_week', 'starts_at', 'ends_at', 'is_active'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean', 'day_of_week' => 'integer'];
    }

    /** @return BelongsTo<DoctorProfile, $this> */
    public function doctorProfile(): BelongsTo
    {
        return $this->belongsTo(DoctorProfile::class);
    }

    /** @return BelongsTo<ClinicBranch, $this> */
    public function branch(): BelongsTo
    {
        return $this->belongsTo(ClinicBranch::class, 'clinic_branch_id');
    }

    /** @return HasMany<ScheduleBreak, $this> */
    public function breaks(): HasMany
    {
        return $this->hasMany(ScheduleBreak::class)->orderBy('starts_at');
    }
}
