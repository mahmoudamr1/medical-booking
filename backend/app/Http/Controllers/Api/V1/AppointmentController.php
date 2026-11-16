<?php

namespace App\Http\Controllers\Api\V1;

use App\Actions\Booking\BookAppointment;
use App\Actions\Booking\RescheduleAppointment;
use App\Actions\Booking\TransitionAppointment;
use App\Enums\AppointmentStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Appointment\ListPatientAppointmentsRequest;
use App\Http\Requests\Appointment\RescheduleAppointmentRequest;
use App\Http\Requests\Appointment\StoreAppointmentRequest;
use App\Http\Requests\Appointment\TransitionAppointmentRequest;
use App\Http\Resources\AppointmentResource;
use App\Models\Appointment;
use App\Models\PatientProfile;
use App\Support\ApiResponse;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

/** Patient-side booking + shared appointment actions (actor capacity is derived server-side). */
class AppointmentController extends Controller
{
    public function store(StoreAppointmentRequest $request, BookAppointment $book): JsonResponse
    {
        $data = $request->validated();
        $appointment = $book->handle(
            PatientProfile::forUser($request->user()),
            $data['doctor_id'],
            $data['service_id'],
            CarbonImmutable::parse($data['starts_at'])->utc(),
            $request->user(),
            'patient',
            $data['notes'] ?? null,
        );

        return ApiResponse::created(
            new AppointmentResource($appointment->load(AppointmentResource::RELATIONS)),
            __($appointment->status === AppointmentStatus::Confirmed ? 'booking.booked' : 'booking.requested'),
        );
    }

    public function patientIndex(ListPatientAppointmentsRequest $request): JsonResponse
    {
        $filters = $request->validated();
        $patient = PatientProfile::forUser($request->user());

        $query = Appointment::with(AppointmentResource::RELATIONS)->where('patient_profile_id', $patient->id);
        match ($filters['group'] ?? null) {
            'upcoming' => $query->where('status', AppointmentStatus::Confirmed->value)->where('starts_at', '>=', now())->orderBy('starts_at'),
            'pending' => $query->where('status', AppointmentStatus::PendingConfirmation->value)->orderBy('starts_at'),
            'completed' => $query->where('status', AppointmentStatus::Completed->value)->orderByDesc('starts_at'),
            'cancelled' => $query->whereNotIn('status', ['confirmed', 'pending_confirmation', 'completed'])->orderByDesc('starts_at'),
            'past' => $query->where('status', AppointmentStatus::Confirmed->value)->where('starts_at', '<', now())->orderByDesc('starts_at'),
            default => $query->orderByDesc('starts_at'),
        };

        return ApiResponse::ok(AppointmentResource::collection($query->paginate($filters['per_page'] ?? 10)));
    }

    /** Counts per dashboard group for tabs. */
    public function patientSummary(Request $request): JsonResponse
    {
        $patient = PatientProfile::forUser($request->user());
        $base = fn () => Appointment::where('patient_profile_id', $patient->id);

        return ApiResponse::ok([
            'upcoming' => $base()->where('status', 'confirmed')->where('starts_at', '>=', now())->count(),
            'pending' => $base()->where('status', 'pending_confirmation')->count(),
            'completed' => $base()->where('status', 'completed')->count(),
            'cancelled' => $base()->whereNotIn('status', ['confirmed', 'pending_confirmation', 'completed'])->count(),
        ]);
    }

    public function show(Appointment $appointment): JsonResponse
    {
        Gate::authorize('view', $appointment);

        return ApiResponse::ok(new AppointmentResource($appointment->load(AppointmentResource::DETAIL_RELATIONS)));
    }

    /** Access (AppointmentPolicy@view) is checked by the Form Request before anything else. */
    public function transition(TransitionAppointmentRequest $request, Appointment $appointment, string $action, TransitionAppointment $transition): JsonResponse
    {
        $updated = $transition->handle($appointment, str_replace('-', '_', $action), $request->user(), $request->validated('reason'));

        return ApiResponse::ok(new AppointmentResource($updated->load(AppointmentResource::RELATIONS)), __('booking.updated'));
    }

    public function reschedule(RescheduleAppointmentRequest $request, Appointment $appointment, RescheduleAppointment $reschedule): JsonResponse
    {
        $data = $request->validated();
        $new = $reschedule->handle($appointment, CarbonImmutable::parse($data['starts_at'])->utc(), $request->user(), $data['service_id'] ?? null);

        return ApiResponse::created(new AppointmentResource($new->load(AppointmentResource::RELATIONS)), __('booking.rescheduled'));
    }
}
