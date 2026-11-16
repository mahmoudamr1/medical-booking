<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Controller;
use App\Http\Requests\Public\ShowAvailabilityRequest;
use App\Models\DoctorProfile;
use App\Services\Scheduling\AvailabilityService;
use App\Support\ApiResponse;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;

/** Availability is a snapshot; booking revalidates server-side. */
class AvailabilityController extends Controller
{
    public function __invoke(ShowAvailabilityRequest $request, string $doctor, AvailabilityService $availability): JsonResponse
    {
        $profile = DoctorProfile::publiclyVisible()->with('user')->findOrFail($doctor);
        $today = CarbonImmutable::now($profile->timezone)->toDateString();
        $data = $request->validated();
        $from = max($data['date_from'] ?? $today, $today);
        $to = $data['date_to'] ?? CarbonImmutable::parse($from)->addDays(6)->toDateString();
        if (CarbonImmutable::parse($from)->diffInDays(CarbonImmutable::parse($to)) > 14) {
            return ApiResponse::error(__('booking.range_too_large'), 422, ['date_to' => [__('booking.range_too_large')]], 'validation_failed');
        }

        $service = $profile->services()->where('is_active', true)->findOrFail($data['service_id']);
        $days = [];
        foreach ($availability->slots($profile, $service, $from, $to) as $date => $slots) {
            $days[] = ['date' => $date, 'slots' => array_map(fn ($s) => [
                'starts_at' => $s['starts_at']->toIso8601String(),
                'ends_at' => $s['ends_at']->toIso8601String(),
            ], $slots)];
        }

        return ApiResponse::ok([
            'doctor_id' => $profile->id,
            'service_id' => $service->id,
            'timezone' => $profile->timezone,
            'date_from' => $from,
            'date_to' => $to,
            'days' => $days,
        ]);
    }
}
