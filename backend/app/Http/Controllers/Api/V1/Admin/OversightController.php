<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Actions\Booking\TransitionAppointment;
use App\Enums\ActorRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\CancelAppointmentRequest;
use App\Http\Requests\Admin\ListAppointmentsRequest;
use App\Http\Requests\Admin\ListClinicsRequest;
use App\Http\Requests\Admin\ListUrgentRequestsRequest;
use App\Http\Requests\Admin\UpdateClinicStatusRequest;
use App\Http\Resources\AppointmentResource;
use App\Http\Resources\UrgentRequestResource;
use App\Models\Appointment;
use App\Models\Clinic;
use App\Models\UrgentRequest;
use App\Services\Audit\AuditLogger;
use App\Support\ApiResponse;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Admin oversight of clinics, appointments and urgent requests. Sensitive reads are audited. */
class OversightController extends Controller
{
    public function __construct(private readonly AuditLogger $audit) {}

    public function clinics(ListClinicsRequest $request): JsonResponse
    {
        $data = $request->validated();
        $page = Clinic::with('owner:id,name,email')
            ->withCount(['branches', 'memberships', 'affiliations'])
            ->when($data['q'] ?? null, fn ($q, $t) => $q->where(fn ($w) => $w->where('name_ar', 'ILIKE', "%{$t}%")->orWhere('name_en', 'ILIKE', "%{$t}%")))
            ->when($data['status'] ?? null, fn ($q, $s) => $q->where('status', $s))
            ->latest()->paginate(25);
        $page->through(fn (Clinic $c) => $c->only(['id', 'slug', 'name_ar', 'name_en', 'is_personal_practice']) + [
            'status' => $c->status->value, 'owner' => $c->owner?->only(['id', 'name', 'email']),
            'branches_count' => $c->branches_count, 'staff_count' => $c->memberships_count, 'doctors_count' => $c->affiliations_count,
            'created_at' => $c->created_at?->toIso8601String(),
        ]);

        return ApiResponse::paginated($page);
    }

    public function clinicStatus(UpdateClinicStatusRequest $request, Clinic $clinic): JsonResponse
    {
        $data = $request->validated();
        $previous = $clinic->status->value;
        $clinic->forceFill(['status' => $data['status']])->save();
        $this->audit->log('clinic.status.changed', $clinic, ['from' => $previous, 'to' => $data['status'], 'reason' => $data['reason'] ?? null]);

        return ApiResponse::ok(['id' => $clinic->id, 'status' => $clinic->status->value]);
    }

    public function appointments(ListAppointmentsRequest $request): JsonResponse
    {
        $data = $request->validated();
        $page = Appointment::with(AppointmentResource::RELATIONS)
            ->when($data['status'] ?? null, fn ($q, $v) => $q->where('status', $v))
            ->when($data['doctor_id'] ?? null, fn ($q, $v) => $q->where('doctor_profile_id', $v))
            ->when($data['clinic_id'] ?? null, fn ($q, $v) => $q->where('clinic_id', $v))
            ->when($data['q'] ?? null, fn ($q, $v) => $q->where('reference', 'ILIKE', "%{$v}%"))
            ->when($data['from'] ?? null, fn ($q, $v) => $q->where('starts_at', '>=', CarbonImmutable::parse($v)->utc()))
            ->when($data['to'] ?? null, fn ($q, $v) => $q->where('starts_at', '<', CarbonImmutable::parse($v)->utc()))
            ->orderByDesc('starts_at')->paginate($data['per_page'] ?? 25);

        return ApiResponse::ok(AppointmentResource::collection($page));
    }

    public function cancelAppointment(CancelAppointmentRequest $request, Appointment $appointment, TransitionAppointment $transition): JsonResponse
    {
        $reason = $request->validated('reason');
        $updated = $transition->handle($appointment, 'cancel', $request->user(), $reason, ActorRole::Admin);
        $this->audit->log('appointment.cancelled_by_admin', $updated, ['reason' => $reason]);

        return ApiResponse::ok(new AppointmentResource($updated->load(AppointmentResource::RELATIONS)));
    }

    public function urgentRequests(ListUrgentRequestsRequest $request): JsonResponse
    {
        $page = UrgentRequest::with(UrgentRequestResource::ADMIN_RELATIONS)
            ->when($request->validated('status'), fn ($q, $v) => $q->where('status', $v))
            ->when($request->boolean('flagged'), fn ($q) => $q->whereNotNull('flagged_at'))
            ->latest()->paginate(25);
        $page->through(fn (UrgentRequest $r) => (new UrgentRequestResource($r))->viewerRole('admin')->resolve($request));

        return ApiResponse::paginated($page);
    }

    public function urgentRequest(Request $request, UrgentRequest $urgentRequest): JsonResponse
    {
        $this->audit->log('urgent.request.viewed', $urgentRequest, ['as' => 'admin']);

        return ApiResponse::ok((new UrgentRequestResource($urgentRequest->load(UrgentRequestResource::ADMIN_RELATIONS)))
            ->viewerRole('admin')->resolve($request));
    }
}
