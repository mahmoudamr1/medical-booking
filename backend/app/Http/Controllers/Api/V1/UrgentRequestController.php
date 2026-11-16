<?php

namespace App\Http\Controllers\Api\V1;

use App\Actions\Urgent\CreateUrgentRequest;
use App\Actions\Urgent\UrgentRequestActions;
use App\Enums\UrgentSeverity;
use App\Http\Controllers\Controller;
use App\Http\Requests\Urgent\CancelUrgentRequestRequest;
use App\Http\Requests\Urgent\ListDoctorUrgentRequestsRequest;
use App\Http\Requests\Urgent\RespondUrgentRequestRequest;
use App\Http\Requests\Urgent\StoreUrgentRequestRequest;
use App\Http\Resources\UrgentRequestResource;
use App\Models\DoctorProfile;
use App\Models\PatientProfile;
use App\Models\UrgentRequest;
use App\Models\UrgentRequestDispatch;
use App\Services\Audit\AuditLogger;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UrgentRequestController extends Controller
{
    public function __construct(private readonly UrgentRequestActions $actions) {}

    // ---- Patient ---------------------------------------------------------------

    public function store(StoreUrgentRequestRequest $request, CreateUrgentRequest $create): JsonResponse
    {
        $urgent = $create->handle(PatientProfile::forUser($request->user()), $request->validated(), $request->ip());

        return ApiResponse::created($this->resource($urgent, 'patient'));
    }

    public function patientIndex(Request $request): JsonResponse
    {
        $patient = PatientProfile::forUser($request->user());
        $page = UrgentRequest::with(UrgentRequestResource::RELATIONS)
            ->withCount(UrgentRequest::unreadMessagesCount($request->user()->id, 'patient'))
            ->where('patient_profile_id', $patient->id)->latest()->paginate(10);
        $page->through(fn (UrgentRequest $r) => $this->resource($r, 'patient'));

        return ApiResponse::paginated($page);
    }

    public function cancel(CancelUrgentRequestRequest $request, UrgentRequest $urgentRequest): JsonResponse
    {
        return ApiResponse::ok($this->resource($this->actions->cancel($urgentRequest, $request->user(), $request->validated('reason')), 'patient'));
    }

    // ---- Shared view (patient owner, dispatched/accepted doctor) ---------------------

    public function show(Request $request, UrgentRequest $urgentRequest, AuditLogger $audit): JsonResponse
    {
        $user = $request->user();
        $urgentRequest->load('patientProfile');

        if ($urgentRequest->patientProfile->user_id === $user->id) {
            return ApiResponse::ok($this->resource($urgentRequest, 'patient'));
        }

        $doctor = DoctorProfile::where('user_id', $user->id)->first();
        $dispatch = $doctor ? UrgentRequestDispatch::where('urgent_request_id', $urgentRequest->id)
            ->where('doctor_profile_id', $doctor->id)->first() : null;
        abort_if($dispatch === null, 404); // not dispatched to this doctor → indistinguishable from non-existent

        $dispatch->viewed_at ??= now()->toImmutable();
        $dispatch->save();
        $role = $urgentRequest->accepted_doctor_profile_id === $doctor->id ? 'accepted_doctor' : 'dispatched_doctor';
        $audit->log('urgent.request.viewed', $urgentRequest, ['as' => $role]); // every doctor access is logged

        $urgentRequest->load(['dispatches' => fn ($q) => $q->where('doctor_profile_id', $doctor->id)]);

        return ApiResponse::ok($this->resource($urgentRequest, $role));
    }

    // ---- Volunteer doctor ------------------------------------------------------

    /**
     * status=open is ordered by severity (critical first), then longest waiting first.
     * meta.counts carries the size of every tab so the inbox needs a single request.
     */
    public function doctorIndex(ListDoctorUrgentRequestsRequest $request): JsonResponse
    {
        $doctor = DoctorProfile::forUser($request->user());
        $tab = $request->validated('status');

        $query = UrgentRequest::with([...UrgentRequestResource::RELATIONS, 'dispatches' => fn ($q) => $q->where('doctor_profile_id', $doctor->id)])
            ->withCount(UrgentRequest::unreadMessagesCount($request->user()->id, 'doctor'))
            ->dispatchedTo($doctor->id, $tab);
        if ($tab === 'open') {
            $query->orderByRaw(UrgentSeverity::rankSql('urgent_requests.severity'))->oldest();
        } else {
            $query->latest();
        }

        $page = $query->paginate(20);
        $page->through(fn (UrgentRequest $r) => $this->resource($r,
            $r->accepted_doctor_profile_id === $doctor->id ? 'accepted_doctor' : 'dispatched_doctor'));
        $counts = collect(UrgentRequest::DOCTOR_TABS)
            ->mapWithKeys(fn (string $t) => [$t => UrgentRequest::dispatchedTo($doctor->id, $t)->count()])->all();

        return ApiResponse::paginated($page, meta: ['counts' => $counts]);
    }

    public function respond(RespondUrgentRequestRequest $request, UrgentRequest $urgentRequest, string $action): JsonResponse
    {
        $doctor = DoctorProfile::forUser($request->user());

        $result = match ($action) {
            'accept' => $this->actions->accept($urgentRequest, $doctor),
            'decline' => tap($urgentRequest, fn () => $this->actions->decline($urgentRequest, $doctor)),
            'start' => $this->actions->progress($urgentRequest, $doctor, 'start'),
            'complete' => $this->actions->progress($urgentRequest, $doctor, 'complete', $request->validated('outcome_note')),
            'report' => tap($urgentRequest, fn () => $this->actions->flag($urgentRequest, $doctor, $request->validated('reason'))),
            default => abort(404), // the route only admits the actions above
        };

        $result = $result->fresh();
        $role = $result->accepted_doctor_profile_id === $doctor->id ? 'accepted_doctor' : 'dispatched_doctor';

        return ApiResponse::ok($this->resource($result, $role));
    }

    /** Participants also get their unread message count (loaded here unless the list query did). */
    private function resource(UrgentRequest $r, string $role): array
    {
        if (in_array($role, ['patient', 'accepted_doctor'], true) && ! array_key_exists('unread_messages_count', $r->getAttributes())) {
            $r->loadCount(UrgentRequest::unreadMessagesCount((string) request()->user()?->getKey(), $role === 'patient' ? 'patient' : 'doctor'));
        }

        return (new UrgentRequestResource($r->loadMissing(UrgentRequestResource::RELATIONS)))->viewerRole($role)->resolve(request());
    }
}
