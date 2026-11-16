<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ListAuditLogsRequest;
use App\Http\Requests\Admin\UpdateSettingsRequest;
use App\Models\AuditLog;
use App\Services\Audit\AuditLogger;
use App\Services\Settings;
use App\Support\ApiResponse;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;

/** Audit log review and platform settings. */
class PlatformController extends Controller
{
    public function auditLogs(ListAuditLogsRequest $request): JsonResponse
    {
        $data = $request->validated();
        $page = AuditLog::with('actor:id,name,email')
            ->when($data['action'] ?? null, fn ($q, $v) => $q->where('action', 'like', $v.'%'))
            ->when($data['actor_id'] ?? null, fn ($q, $v) => $q->where('actor_user_id', $v))
            ->when($data['subject_id'] ?? null, fn ($q, $v) => $q->where('subject_id', $v))
            ->when($data['from'] ?? null, fn ($q, $v) => $q->where('created_at', '>=', CarbonImmutable::parse($v)->utc()))
            ->when($data['to'] ?? null, fn ($q, $v) => $q->where('created_at', '<', CarbonImmutable::parse($v)->utc()))
            ->orderByDesc('id')->paginate($data['per_page'] ?? 50);
        $page->through(fn (AuditLog $l) => [
            'id' => $l->id, 'action' => $l->action, 'subject_type' => $l->subject_type, 'subject_id' => $l->subject_id,
            'actor' => $l->actor?->only(['id', 'name', 'email']), 'ip_address' => $l->ip_address,
            'changes' => $l->changes, 'created_at' => $l->created_at?->toIso8601String(),
        ]);

        return ApiResponse::paginated($page);
    }

    public function settings(Settings $settings): JsonResponse
    {
        return ApiResponse::ok($settings->all());
    }

    public function updateSettings(UpdateSettingsRequest $request, Settings $settings, AuditLogger $audit): JsonResponse
    {
        $data = $request->validated();
        $before = array_intersect_key($settings->all(), $data);
        $settings->update($data, $request->user()->id);
        $audit->log('settings.updated', null, ['before' => $before, 'after' => $data]);

        return ApiResponse::ok($settings->all());
    }
}
