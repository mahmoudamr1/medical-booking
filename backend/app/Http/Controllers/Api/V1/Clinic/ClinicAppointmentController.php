<?php

namespace App\Http\Controllers\Api\V1\Clinic;

use App\Actions\Booking\BookAppointment;
use App\Actions\Booking\TransitionAppointment;
use App\Actions\Clinics\FindOrInvitePatient;
use App\Enums\ActorRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Clinic\ListClinicAppointmentsRequest;
use App\Http\Requests\Clinic\StoreClinicAppointmentRequest;
use App\Http\Requests\Shared\ReasonRequest;
use App\Http\Resources\AppointmentResource;
use App\Models\Appointment;
use App\Models\Clinic;
use App\Services\Audit\AuditLogger;
use App\Support\ApiResponse;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;

/**
 * Appointments belonging to this clinic. Every lookup is constrained by clinic_id, so a
 * foreign appointment id returns 404 (no disclosure).
 */
class ClinicAppointmentController extends Controller
{
    public function index(ListClinicAppointmentsRequest $request, Clinic $clinic): JsonResponse
    {
        $data = $request->validated();
        $query = Appointment::with(AppointmentResource::RELATIONS)
            ->where('clinic_id', $clinic->id)
            ->when($data['branch_id'] ?? null, fn ($q, $v) => $q->where('clinic_branch_id', $v))
            ->when($data['doctor_id'] ?? null, fn ($q, $v) => $q->where('doctor_profile_id', $v))
            ->when($data['status'] ?? null, fn ($q, $v) => $q->where('status', $v))
            ->when($data['from'] ?? null, fn ($q, $v) => $q->where('starts_at', '>=', CarbonImmutable::parse($v)->utc()))
            ->when($data['to'] ?? null, fn ($q, $v) => $q->where('starts_at', '<', CarbonImmutable::parse($v)->utc()))
            ->when($data['q'] ?? null, fn ($q, $v) => $q->where(fn ($w) => $w->where('reference', 'ILIKE', "%{$v}%")
                ->orWhereHas('patientProfile.user', fn ($u) => $u->where('name', 'ILIKE', "%{$v}%"))))
            ->orderBy('starts_at');

        return ApiResponse::ok(AppointmentResource::collection($query->paginate($data['per_page'] ?? 50)));
    }

    public function show(Clinic $clinic, string $appointment): JsonResponse
    {
        return ApiResponse::ok(new AppointmentResource(
            $this->find($clinic, $appointment)->load(AppointmentResource::DETAIL_RELATIONS)));
    }

    /** Reception booking on behalf of a patient (existing account by email, or a new account). */
    public function store(StoreClinicAppointmentRequest $request, Clinic $clinic, FindOrInvitePatient $patients, BookAppointment $book, AuditLogger $audit): JsonResponse
    {
        $data = $request->validated();
        $patient = $patients->handle($data['patient_email'], $data['patient_name'] ?? null, $data['patient_phone'] ?? null);

        $appointment = $book->handle($patient, $data['doctor_id'], $data['service_id'],
            CarbonImmutable::parse($data['starts_at'])->utc(), $request->user(), 'clinic_staff', $data['notes'] ?? null);
        $audit->log('clinic.appointment.booked_on_behalf', $appointment, ['clinic_id' => $clinic->id]);

        return ApiResponse::created(new AppointmentResource($appointment->load(AppointmentResource::RELATIONS)));
    }

    public function transition(ReasonRequest $request, Clinic $clinic, string $appointment, string $action, TransitionAppointment $transition): JsonResponse
    {
        abort_unless(in_array($action, ['confirm', 'cancel', 'complete', 'no-show', 'reject'], true), 404);
        $model = $this->find($clinic, $appointment);
        $updated = $transition->handle($model, str_replace('-', '_', $action), $request->user(), $request->validated('reason'), ActorRole::Clinic);

        return ApiResponse::ok(new AppointmentResource($updated->load(AppointmentResource::RELATIONS)), __('booking.updated'));
    }

    private function find(Clinic $clinic, string $id): Appointment
    {
        return Appointment::where('clinic_id', $clinic->id)->findOrFail($id);
    }
}
