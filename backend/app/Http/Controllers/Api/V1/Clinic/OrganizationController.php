<?php

namespace App\Http\Controllers\Api\V1\Clinic;

use App\Actions\Clinics\CreateClinic;
use App\Enums\MembershipStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Clinic\ClinicDetailsRequest;
use App\Http\Resources\ClinicManageResource;
use App\Models\Clinic;
use App\Models\ClinicMembership;
use App\Services\Audit\AuditLogger;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrganizationController extends Controller
{
    public function store(ClinicDetailsRequest $request, CreateClinic $create, AuditLogger $audit): JsonResponse
    {
        $clinic = $create->handle($request->user(), $request->validated());
        $audit->log('clinic.created', $clinic);

        return ApiResponse::created(new ClinicManageResource($clinic));
    }

    /** Clinics the current user is an active member of, with their role. */
    public function mine(Request $request): JsonResponse
    {
        $memberships = ClinicMembership::with('clinic')
            ->where('user_id', $request->user()->id)
            ->where('status', MembershipStatus::Active->value)
            ->get();

        return ApiResponse::ok($memberships->map(fn (ClinicMembership $m) => [
            'role' => $m->role->value,
            'clinic' => (new ClinicManageResource($m->clinic))->resolve($request),
        ])->values());
    }

    public function show(Clinic $clinic): JsonResponse
    {
        return ApiResponse::ok(new ClinicManageResource($clinic));
    }

    public function update(ClinicDetailsRequest $request, Clinic $clinic, AuditLogger $audit): JsonResponse
    {
        $clinic->update($request->validated());
        $audit->log('clinic.updated', $clinic, $clinic->getChanges());

        return ApiResponse::ok(new ClinicManageResource($clinic));
    }
}
