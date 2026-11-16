<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** A time-bounded availability window. Windows expire by time; nothing is "available forever". */
class VolunteerAvailability extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = ['volunteer_profile_id', 'starts_at', 'ends_at', 'mode', 'kind'];

    protected function casts(): array
    {
        return ['starts_at' => 'immutable_datetime', 'ends_at' => 'immutable_datetime'];
    }

    /** @return BelongsTo<VolunteerProfile, $this> */
    public function volunteerProfile(): BelongsTo
    {
        return $this->belongsTo(VolunteerProfile::class);
    }

    /**
     * @param  Builder<VolunteerAvailability>  $query
     * @return Builder<VolunteerAvailability>
     */
    public function scopeCurrent(Builder $query): Builder
    {
        return $query->where('starts_at', '<=', now())->where('ends_at', '>', now());
    }
}
