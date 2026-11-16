<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ScheduleBreak extends Model
{
    public $timestamps = false;

    protected $fillable = ['doctor_schedule_id', 'starts_at', 'ends_at'];

    /** @return BelongsTo<DoctorSchedule, $this> */
    public function schedule(): BelongsTo
    {
        return $this->belongsTo(DoctorSchedule::class, 'doctor_schedule_id');
    }
}
