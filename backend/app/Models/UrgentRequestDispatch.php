<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** One notification attempt of an urgent request to one volunteer doctor. */
class UrgentRequestDispatch extends Model
{
    public $timestamps = false;

    protected $fillable = ['urgent_request_id', 'doctor_profile_id', 'tier', 'status', 'notified_at', 'responded_at', 'viewed_at'];

    protected function casts(): array
    {
        return [
            'tier' => 'integer',
            'notified_at' => 'immutable_datetime',
            'responded_at' => 'immutable_datetime',
            'viewed_at' => 'immutable_datetime',
        ];
    }

    /** @return BelongsTo<UrgentRequest, $this> */
    public function urgentRequest(): BelongsTo
    {
        return $this->belongsTo(UrgentRequest::class);
    }

    /** @return BelongsTo<DoctorProfile, $this> */
    public function doctorProfile(): BelongsTo
    {
        return $this->belongsTo(DoctorProfile::class);
    }
}
