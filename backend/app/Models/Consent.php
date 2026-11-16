<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Consent extends Model
{
    use HasUlids;

    public const TYPES = ['terms', 'urgent_data_sharing', 'marketing', 'medical_data_processing'];

    protected $fillable = ['user_id', 'type', 'granted', 'version', 'granted_at', 'revoked_at', 'ip_address'];

    protected function casts(): array
    {
        return ['granted' => 'boolean', 'granted_at' => 'datetime', 'revoked_at' => 'datetime'];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
