<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One text message between the patient and the accepted doctor of an urgent request.
 * Written and read only through App\Actions\Urgent\UrgentMessages (participant checks + audit).
 */
class UrgentRequestMessage extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = ['urgent_request_id', 'sender_user_id', 'body'];

    protected function casts(): array
    {
        return ['created_at' => 'immutable_datetime'];
    }

    /** @return BelongsTo<UrgentRequest, $this> */
    public function urgentRequest(): BelongsTo
    {
        return $this->belongsTo(UrgentRequest::class);
    }
}
