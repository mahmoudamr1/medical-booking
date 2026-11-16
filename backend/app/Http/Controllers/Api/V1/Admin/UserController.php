<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\UserStatus;
use App\Exceptions\BusinessRuleException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ListUsersRequest;
use App\Http\Requests\Admin\UpdateUserStatusRequest;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class UserController extends Controller
{
    public function index(ListUsersRequest $request): JsonResponse
    {
        $data = $request->validated();
        $page = User::with('roles')
            ->when($data['q'] ?? null, fn ($q, $t) => $q->where(fn ($w) => $w->where('name', 'ILIKE', "%{$t}%")
                ->orWhere('email', 'ILIKE', "%{$t}%")->orWhere('phone', 'ILIKE', "%{$t}%")))
            ->when($data['role'] ?? null, fn ($q, $r) => $q->whereHas('roles', fn ($w) => $w->where('name', $r)))
            ->when($data['status'] ?? null, fn ($q, $s) => $q->where('status', $s))
            ->latest()->paginate($data['per_page'] ?? 25);
        $page->through(fn (User $u) => $this->row($u));

        return ApiResponse::paginated($page);
    }

    /** Suspend / reactivate. Suspended users are logged out on their next request (EnsureActiveUser). */
    public function status(UpdateUserStatusRequest $request, User $user, AuditLogger $audit): JsonResponse
    {
        $data = $request->validated();
        if ($user->id === $request->user()->id) {
            throw BusinessRuleException::conflict('self_action', __('admin.cannot_suspend_self'));
        }

        $previous = $user->status->value;
        DB::transaction(function () use ($user, $data) {
            $user->forceFill(['status' => $data['status'], 'status_reason' => $data['reason'] ?? null])->save();
            if ($data['status'] === UserStatus::Suspended->value) {
                DB::table('sessions')->where('user_id', $user->id)->delete(); // invalidate active sessions
            }
        });
        $audit->log('user.status.changed', $user, ['from' => $previous, 'to' => $data['status'], 'reason' => $data['reason'] ?? null]);

        return ApiResponse::ok($this->row($user->fresh('roles')));
    }

    private function row(User $u): array
    {
        return [
            'id' => $u->id, 'name' => $u->name, 'email' => $u->email, 'phone' => $u->phone,
            'status' => $u->status->value, 'status_reason' => $u->status_reason,
            'roles' => $u->roles->pluck('name'), 'email_verified' => $u->email_verified_at !== null,
            'last_login_at' => $u->last_login_at?->toIso8601String(), 'created_at' => $u->created_at?->toIso8601String(),
        ];
    }
}
