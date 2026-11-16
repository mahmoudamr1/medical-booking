<?php

namespace App\Http\Controllers\Api\V1\Doctor;

use App\Actions\Scheduling\ReplaceWeeklySchedule;
use App\Exceptions\BusinessRuleException;
use App\Http\Requests\Doctor\ListExceptionsRequest;
use App\Http\Requests\Doctor\ReplaceSchedulesRequest;
use App\Http\Requests\Doctor\SaveServiceRequest;
use App\Http\Requests\Doctor\StoreExceptionRequest;
use App\Http\Requests\Doctor\UpdatePreferencesRequest;
use App\Http\Resources\ServiceResource;
use App\Models\DoctorProfile;
use App\Models\DoctorSchedule;
use App\Models\MedicalService;
use App\Models\ScheduleException;
use App\Services\Scheduling\AvailabilityService;
use App\Support\ApiResponse;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/** Doctor-owned schedule configuration: weekly hours, breaks, exceptions, preferences, services. */
class ScheduleController extends DoctorController
{
    public function __construct(private readonly AvailabilityService $availability) {}

    // ---- Weekly schedule -------------------------------------------------------

    public function schedules(Request $request): JsonResponse
    {
        return ApiResponse::ok($this->scheduleRows($this->doctor($request)));
    }

    /** Replaces the whole weekly schedule atomically (see ReplaceWeeklySchedule). */
    public function replaceSchedules(ReplaceSchedulesRequest $request, ReplaceWeeklySchedule $replace): JsonResponse
    {
        $doctor = $request->doctor();
        $replace->handle($doctor, $request->validated('schedules'));

        return ApiResponse::ok($this->scheduleRows($doctor), __('schedule.saved'));
    }

    // ---- Exceptions (holidays, closures, custom hours) ------------------------------

    /** Today's and future exceptions by default; `from`/`to` (Y-m-d) open any window, including the past. */
    public function exceptions(ListExceptionsRequest $request): JsonResponse
    {
        $doctor = $request->doctor();

        return ApiResponse::ok(ScheduleException::where('doctor_profile_id', $doctor->id)
            ->where('date', '>=', $request->validated('from') ?? now($doctor->timezone)->toDateString())
            ->when($request->validated('to'), fn ($q, $to) => $q->where('date', '<=', $to))
            ->orderBy('date')->get()
            ->map(fn (ScheduleException $e) => $this->exceptionRow($e)));
    }

    public function storeException(StoreExceptionRequest $request): JsonResponse
    {
        $doctor = $request->doctor();
        $data = $request->validated();

        $first = CarbonImmutable::parse($data['date']);
        $last = CarbonImmutable::parse($data['date_to'] ?? $data['date']);
        if ($first->diffInDays($last) > 60) {
            throw BusinessRuleException::unprocessable('validation_failed', __('booking.range_too_large'),
                ['date_to' => [__('booking.range_too_large')]]);
        }

        $created = DB::transaction(function () use ($doctor, $data, $first, $last) {
            $rows = [];
            for ($date = $first; $date <= $last; $date = $date->addDay()) {
                $rows[] = ScheduleException::updateOrCreate(
                    ['doctor_profile_id' => $doctor->id, 'date' => $date->toDateString(), 'clinic_branch_id' => $data['clinic_branch_id'] ?? null],
                    ['type' => $data['type'], 'reason' => $data['reason'] ?? null,
                        'starts_at' => $data['type'] === 'custom_hours' ? $data['starts_at'] : null,
                        'ends_at' => $data['type'] === 'custom_hours' ? $data['ends_at'] : null],
                );
            }

            return $rows;
        });
        $this->availability->refreshNextAvailable($doctor);

        return ApiResponse::created(array_map(fn ($e) => $this->exceptionRow($e), $created));
    }

    public function destroyException(Request $request, string $exception): JsonResponse
    {
        $doctor = $this->doctor($request);
        ScheduleException::where('doctor_profile_id', $doctor->id)->findOrFail($exception)->delete();
        $this->availability->refreshNextAvailable($doctor);

        return ApiResponse::noContent();
    }

    // ---- Booking preferences -------------------------------------------------------

    public function preferences(Request $request): JsonResponse
    {
        return ApiResponse::ok($this->preferenceRow($this->doctor($request)));
    }

    public function updatePreferences(UpdatePreferencesRequest $request): JsonResponse
    {
        $doctor = $request->doctor();
        $doctor->update($request->validated());
        $this->availability->refreshNextAvailable($doctor);

        return ApiResponse::ok($this->preferenceRow($doctor->fresh()));
    }

    // ---- Services -------------------------------------------------------------------

    public function services(Request $request): JsonResponse
    {
        return ApiResponse::ok(ServiceResource::collection(
            $this->doctor($request)->services()->with('branch.city')->orderBy('created_at')->get()));
    }

    public function storeService(SaveServiceRequest $request): JsonResponse
    {
        $doctor = $request->doctor();
        $service = new MedicalService(['doctor_profile_id' => $doctor->id] + $request->serviceAttributes());
        $service->save();
        $this->availability->refreshNextAvailable($doctor);

        return ApiResponse::created(new ServiceResource($service->load('branch.city')));
    }

    /** Price/duration changes never alter existing appointments (they snapshot price and period). */
    public function updateService(SaveServiceRequest $request): JsonResponse
    {
        $model = $request->service();
        $model->update($request->serviceAttributes());
        $this->availability->refreshNextAvailable($request->doctor());

        return ApiResponse::ok(new ServiceResource($model->load('branch.city')));
    }

    public function destroyService(Request $request, string $service): JsonResponse
    {
        $doctor = $this->doctor($request);
        $model = $doctor->services()->findOrFail($service);
        // Services referenced by appointments are deactivated, never deleted.
        if (DB::table('appointments')->where('medical_service_id', $model->id)->exists()) {
            $model->update(['is_active' => false]);
        } else {
            $model->delete();
        }
        $this->availability->refreshNextAvailable($doctor);

        return ApiResponse::noContent();
    }

    // ---- helpers ---------------------------------------------------------------------

    private function scheduleRows(DoctorProfile $doctor): array
    {
        return DoctorSchedule::with('breaks')->where('doctor_profile_id', $doctor->id)
            ->orderBy('day_of_week')->orderBy('starts_at')->get()
            ->map(fn (DoctorSchedule $s) => [
                'id' => $s->id,
                'clinic_branch_id' => $s->clinic_branch_id,
                'day_of_week' => $s->day_of_week,
                'starts_at' => substr($s->starts_at, 0, 5),
                'ends_at' => substr($s->ends_at, 0, 5),
                'breaks' => $s->breaks->map(fn ($b) => ['starts_at' => substr($b->starts_at, 0, 5), 'ends_at' => substr($b->ends_at, 0, 5)])->values(),
            ])->values()->all();
    }

    private function exceptionRow(ScheduleException $e): array
    {
        return [
            'id' => $e->id,
            'date' => $e->date->toDateString(),
            'type' => $e->type,
            'starts_at' => $e->starts_at ? substr($e->starts_at, 0, 5) : null,
            'ends_at' => $e->ends_at ? substr($e->ends_at, 0, 5) : null,
            'clinic_branch_id' => $e->clinic_branch_id,
            'reason' => $e->reason,
        ];
    }

    private function preferenceRow(DoctorProfile $d): array
    {
        return [
            'accepts_bookings' => $d->accepts_bookings,
            'booking_mode' => $d->booking_mode->value,
            'min_cancellation_hours' => $d->min_cancellation_hours,
            'lead_time_minutes' => $d->lead_time_minutes,
            'horizon_days' => $d->horizon_days,
            'buffer_minutes' => $d->buffer_minutes,
            'timezone' => $d->timezone,
        ];
    }
}
