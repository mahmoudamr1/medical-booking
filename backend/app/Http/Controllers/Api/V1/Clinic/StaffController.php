<?php

namespace App\Http\Controllers\Api\V1\Clinic;

use App\Enums\ClinicRole;
use App\Enums\MembershipStatus;
use App\Exceptions\BusinessRuleException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Clinic\InviteStaffRequest;
use App\Http\Requests\Clinic\UpdateStaffRequest;
use App\Models\Clinic;
use App\Models\ClinicMembership;
use App\Models\User;
use App\Notifications\ClinicInvitation;
use App\Services\Audit\AuditLogger;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Staff memberships of one clinic. Invitations target existing accounts; the invitee accepts
 * from their own session (POST /my/invitations/{id}/accept). The owner membership is immutable here.
 */
class StaffController extends Controller
{
    public function __construct(private readonly AuditLogger $audit) {}

    public function index(Clinic $clinic): JsonResponse
    {
        return ApiResponse::ok($clinic->memberships()->with('user:id,name,email,phone')->orderBy('created_at')->get()
            ->map(fn (ClinicMembership $m) => $this->row($m)));
    }

    public function invite(InviteStaffRequest $request, Clinic $clinic): JsonResponse
    {
        $data = $request->validated();
        $user = User::where('email', mb_strtolower($data['email']))->first()
            ?? throw BusinessRuleException::unprocessable('user_not_found', __('clinic.invitee_not_registered'),
                ['email' => [__('clinic.invitee_not_registered')]]);

        if ($clinic->memberships()->where('user_id', $user->id)->exists()) {
            throw BusinessRuleException::conflict('already_member', __('clinic.already_member'));
        }

        $membership = $clinic->memberships()->create([
            'user_id' => $user->id, 'role' => $data['role'], 'status' => MembershipStatus::Invited,
            'invited_by' => $request->user()->id,
        ]);
        $this->audit->log('clinic.staff.invited', $membership, ['clinic_id' => $clinic->id, 'role' => $data['role']]);
        $user->notify(new ClinicInvitation($clinic, $membership));

        return ApiResponse::created($this->row($membership->load('user')));
    }

    public function update(UpdateStaffRequest $request, Clinic $clinic, string $membership): JsonResponse
    {
        $model = $this->membership($clinic, $membership);
        $data = $request->validated();
        if ($model->status === MembershipStatus::Invited && ($data['status'] ?? null) === MembershipStatus::Active->value) {
            throw BusinessRuleException::conflict('invitation_pending', __('clinic.invitation_pending'));
        }
        $model->update($data);
        $this->audit->log('clinic.staff.updated', $model, $model->getChanges());

        return ApiResponse::ok($this->row($model->load('user')));
    }

    public function destroy(Clinic $clinic, string $membership): JsonResponse
    {
        $model = $this->membership($clinic, $membership);
        $this->audit->log('clinic.staff.removed', $model, ['user_id' => $model->user_id, 'role' => $model->role->value]);
        $model->delete();

        return ApiResponse::noContent();
    }

    /** Invitations addressed to the current user (any clinic). */
    public function myInvitations(Request $request): JsonResponse
    {
        return ApiResponse::ok(ClinicMembership::with('clinic')->where('user_id', $request->user()->id)
            ->where('status', MembershipStatus::Invited->value)->get()
            ->map(fn (ClinicMembership $m) => [
                'id' => $m->id, 'role' => $m->role->value,
                'clinic' => $m->clinic->only(['id', 'slug', 'name_ar', 'name_en']),
            ]));
    }

    public function respond(Request $request, string $membership, string $decision): JsonResponse
    {
        $model = ClinicMembership::where('user_id', $request->user()->id)
            ->where('status', MembershipStatus::Invited->value)->findOrFail($membership);

        if ($decision === 'accept') {
            $model->update(['status' => MembershipStatus::Active, 'joined_at' => now()]);
        } else {
            $model->delete();
        }
        $this->audit->log("clinic.invitation.{$decision}", $model, ['clinic_id' => $model->clinic_id]);

        return ApiResponse::ok(null);
    }

    /** Owner membership can't be edited/removed through staff management. */
    private function membership(Clinic $clinic, string $id): ClinicMembership
    {
        $m = $clinic->memberships()->findOrFail($id);
        if ($m->role === ClinicRole::Owner) {
            throw BusinessRuleException::conflict('owner_immutable', __('clinic.owner_immutable'));
        }

        return $m;
    }

    private function row(ClinicMembership $m): array
    {
        return [
            'id' => $m->id,
            'role' => $m->role->value,
            'status' => $m->status->value,
            'joined_at' => $m->joined_at?->toIso8601String(),
            'user' => $m->user ? $m->user->only(['id', 'name', 'email', 'phone']) : null,
        ];
    }
}
