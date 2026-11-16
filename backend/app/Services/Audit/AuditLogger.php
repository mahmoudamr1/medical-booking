<?php

namespace App\Services\Audit;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

/** Records critical admin actions and sensitive data access. */
final class AuditLogger
{
    public function __construct(private readonly Request $request) {}

    /** @param array<string, mixed> $changes */
    public function log(string $action, ?Model $subject = null, array $changes = [], ?string $actorId = null): AuditLog
    {
        return AuditLog::create([
            'actor_user_id' => $actorId ?? $this->request->user()?->getKey(),
            'action' => $action,
            'subject_type' => $subject ? class_basename($subject) : null,
            'subject_id' => $subject?->getKey(),
            'ip_address' => $this->request->ip(),
            'user_agent' => mb_substr((string) $this->request->userAgent(), 0, 500) ?: null,
            'changes' => $changes ?: null,
        ]);
    }
}
