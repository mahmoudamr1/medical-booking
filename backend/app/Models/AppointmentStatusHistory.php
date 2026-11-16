<?php

namespace App\Models;

use App\Enums\ActorRole;
use App\Enums\AppointmentStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Append-only audit trail of appointment transitions. */
class AppointmentStatusHistory extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = ['appointment_id', 'from_status', 'to_status', 'actor_user_id', 'actor_role', 'reason', 'metadata'];

    protected function casts(): array
    {
        return [
            'from_status' => AppointmentStatus::class,
            'to_status' => AppointmentStatus::class,
            'actor_role' => ActorRole::class,
            'metadata' => 'array',
            'created_at' => 'immutable_datetime',
        ];
    }

    /** @return BelongsTo<Appointment, $this> */
    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class);
    }

    /** @return BelongsTo<User, $this> */
    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_user_id');
    }
}
