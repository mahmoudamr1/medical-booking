<?php

namespace App\Http\Controllers\Api\V1\Doctor;

use App\Actions\Clinics\CreateClinic;
use App\Enums\AppointmentStatus;
use App\Http\Requests\Doctor\CreatePracticeRequest;
use App\Http\Requests\Doctor\ListDoctorAppointmentsRequest;
use App\Http\Resources\AppointmentResource;
use App\Http\Resources\BranchResource;
use App\Models\Appointment;
use App\Models\City;
use App\Models\ClinicBranch;
use App\Models\DoctorBranchAffiliation;
use App\Support\ApiResponse;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/** Doctor's own appointments (calendar ranges), dashboard counters, and practice locations. */
class CalendarController extends DoctorController
{
    public function appointments(ListDoctorAppointmentsRequest $request): JsonResponse
    {
        $doctor = $request->doctor();
        $data = $request->validated();
        $from = CarbonImmutable::parse($data['from'] ?? now($doctor->timezone)->startOfDay())->utc();
        $to = CarbonImmutable::parse($data['to'] ?? $from->addDays(7))->utc();
        if ($from->diffInDays($to) > 62) {
            return ApiResponse::error(__('booking.range_too_large'), 422, ['to' => [__('booking.range_too_large')]], 'validation_failed');
        }

        $statuses = array_values(array_intersect(explode(',', (string) ($data['status'] ?? '')), AppointmentStatus::values()));
        $query = Appointment::with(AppointmentResource::RELATIONS)
            ->where('doctor_profile_id', $doctor->id)
            ->where('starts_at', '>=', $from)->where('starts_at', '<', $to)
            ->when($statuses, fn ($q) => $q->whereIn('status', $statuses))
            ->orderBy('starts_at');

        return ApiResponse::ok(AppointmentResource::collection($query->paginate($data['per_page'] ?? 200)));
    }

    /** `pending` counts only requests that can still be confirmed (not yet started), like the pending list. */
    public function dashboard(Request $request): JsonResponse
    {
        $doctor = $this->doctor($request);
        $dayStart = now($doctor->timezone)->startOfDay()->utc();
        $dayEnd = now($doctor->timezone)->endOfDay()->utc();

        // Single aggregate query instead of N count queries ("now" is the app clock, bound as a parameter).
        $now = now();
        $counts = DB::table('appointments')->where('doctor_profile_id', $doctor->id)->selectRaw("
            count(*) filter (where starts_at between ? and ? and status in ('confirmed','pending_confirmation','completed')) as today,
            count(*) filter (where starts_at > ? and status = 'confirmed') as upcoming,
            count(*) filter (where starts_at > ? and status = 'pending_confirmation') as pending,
            count(*) filter (where status = 'completed') as completed,
            count(*) filter (where status like 'cancelled_by_%') as cancelled,
            count(*) filter (where status = 'no_show') as no_show
        ", [$dayStart, $dayEnd, $now, $now])->first();

        $today = Appointment::with(AppointmentResource::RELATIONS)
            ->where('doctor_profile_id', $doctor->id)
            ->whereBetween('starts_at', [$dayStart, $dayEnd])
            ->whereIn('status', ['confirmed', 'pending_confirmation', 'completed', 'no_show'])
            ->orderBy('starts_at')->get();

        return ApiResponse::ok([
            'counts' => (array) $counts,
            'rating_avg' => (float) $doctor->rating_avg,
            'rating_count' => $doctor->rating_count,
            'verification_status' => $doctor->verification_status->value,
            'next_available_at' => $doctor->next_available_at?->toIso8601String(),
            'today' => AppointmentResource::collection($today)->resolve($request),
        ]);
    }

    public function branches(Request $request): JsonResponse
    {
        $doctor = $this->doctor($request);

        return ApiResponse::ok(BranchResource::collection(
            $doctor->branches()->with(['clinic', 'city', 'governorate', 'area'])->get()));
    }

    /** Independent doctors register their own practice location (a personal clinic + branch). */
    public function createPractice(CreatePracticeRequest $request, CreateClinic $createClinic): JsonResponse
    {
        $doctor = $request->doctor();
        $data = $request->validated();
        $city = City::findOrFail($data['city_id']);

        $branch = DB::transaction(function () use ($request, $doctor, $data, $city, $createClinic) {
            $clinic = $createClinic->handle($request->user(), [
                'name_ar' => $data['name_ar'], 'name_en' => $data['name_en'] ?? 'Private practice', 'phone' => $data['phone'] ?? null,
            ], personalPractice: true);
            $branch = ClinicBranch::create([
                'clinic_id' => $clinic->id, 'name_ar' => $data['name_ar'], 'name_en' => $data['name_en'] ?? 'Private practice',
                'governorate_id' => $city->governorate_id, 'city_id' => $city->id, 'area_id' => $data['area_id'] ?? null,
                'address_ar' => $data['address_ar'], 'address_en' => $data['address_en'] ?? null, 'phone' => $data['phone'] ?? null,
            ]);
            DoctorBranchAffiliation::create(['doctor_profile_id' => $doctor->id, 'clinic_branch_id' => $branch->id, 'clinic_id' => $clinic->id]);

            return $branch;
        });

        return ApiResponse::created(new BranchResource($branch->load(['clinic', 'city', 'governorate'])));
    }
}
