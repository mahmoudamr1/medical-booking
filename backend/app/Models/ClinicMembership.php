<?php

namespace App\Models;

use App\Enums\ClinicRole;
use App\Enums\MembershipStatus;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClinicMembership extends Model
{
    use HasUlids;

    protected $attributes = ['status' => 'active'];

    protected $fillable = ['clinic_id', 'user_id', 'role', 'status', 'invited_by', 'joined_at'];

    protected function casts(): array
    {
        return [
            'role' => ClinicRole::class,
            'status' => MembershipStatus::class,
            'joined_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Clinic, $this> */
    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class);
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
