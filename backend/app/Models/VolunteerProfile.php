<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class VolunteerProfile extends Model
{
    use HasUlids;

    protected $attributes = ['status' => 'active', 'max_concurrent_requests' => 1, 'accepts_online' => true, 'accepts_in_person' => false];

    protected $fillable = ['doctor_profile_id', 'status', 'max_concurrent_requests', 'accepts_online', 'accepts_in_person', 'opted_in_at', 'last_availability_update_at'];

    protected function casts(): array
    {
        return [
            'accepts_online' => 'boolean',
            'accepts_in_person' => 'boolean',
            'opted_in_at' => 'datetime',
            'last_availability_update_at' => 'datetime',
            'max_concurrent_requests' => 'integer',
        ];
    }

    /** @return BelongsTo<DoctorProfile, $this> */
    public function doctorProfile(): BelongsTo
    {
        return $this->belongsTo(DoctorProfile::class);
    }

    /** @return BelongsToMany<Specialty, $this> */
    public function specialties(): BelongsToMany
    {
        return $this->belongsToMany(Specialty::class, 'volunteer_specialties');
    }

    /** @return HasMany<VolunteerLocation, $this> */
    public function locations(): HasMany
    {
        return $this->hasMany(VolunteerLocation::class);
    }

    /** @return HasMany<VolunteerAvailability, $this> */
    public function availabilities(): HasMany
    {
        return $this->hasMany(VolunteerAvailability::class);
    }
}
