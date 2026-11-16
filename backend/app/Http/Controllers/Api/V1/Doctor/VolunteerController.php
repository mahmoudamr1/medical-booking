<?php

namespace App\Http\Controllers\Api\V1\Doctor;

use App\Exceptions\BusinessRuleException;
use App\Http\Requests\Doctor\AddAvailabilityRequest;
use App\Http\Requests\Doctor\UpdateVolunteerRequest;
use App\Jobs\MatchWaitingUrgentRequestsJob;
use App\Models\City;
use App\Models\DoctorProfile;
use App\Models\VolunteerAvailability;
use App\Models\VolunteerProfile;
use App\Services\Urgent\UrgentDispatcher;
use App\Support\ApiResponse;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Volunteer program: explicit opt-in, coverage, and time-bounded availability windows. Opting in or
 * adding a window gives waiting urgent requests a new matching round right away.
 */
class VolunteerController extends DoctorController
{
    public function show(Request $request): JsonResponse
    {
        return ApiResponse::ok($this->row($this->doctor($request)));
    }

    public function update(UpdateVolunteerRequest $request, UrgentDispatcher $dispatcher): JsonResponse
    {
        $doctor = $request->doctor();
        $data = $request->validated();

        if ($data['opt_in'] && ! $doctor->isPubliclyVisible()) {
            throw BusinessRuleException::unprocessable('not_verified', __('urgent.must_be_verified'));
        }

        DB::transaction(function () use ($doctor, $data) {
            $profile = VolunteerProfile::firstOrNew(['doctor_profile_id' => $doctor->id]);
            if (! $data['opt_in']) {
                if ($profile->exists) {
                    $profile->update(['status' => 'inactive', 'last_availability_update_at' => now()]);
                    self::endWindows($profile);
                }

                return;
            }
            $profile->fill([
                'status' => 'active',
                'accepts_online' => $data['accepts_online'] ?? $profile->accepts_online ?? true,
                'accepts_in_person' => $data['accepts_in_person'] ?? $profile->accepts_in_person ?? false,
                'max_concurrent_requests' => $data['max_concurrent_requests'] ?? $profile->max_concurrent_requests ?? 1,
                'opted_in_at' => $profile->opted_in_at ?? now(),
            ])->save();
            $profile->specialties()->sync($data['specialty_ids']);
            $profile->locations()->delete();
            foreach ($data['locations'] as $loc) {
                if (($loc['city_id'] ?? null) && City::whereKey($loc['city_id'])->value('governorate_id') !== $loc['governorate_id']) {
                    throw BusinessRuleException::unprocessable('validation_failed', __('api.validation_failed'),
                        ['locations' => [__('validation.exists', ['attribute' => 'city'])]]);
                }
                $profile->locations()->create(['governorate_id' => $loc['governorate_id'], 'city_id' => $loc['city_id'] ?? null]);
            }
        });
        if ($data['opt_in']) {
            MatchWaitingUrgentRequestsJob::dispatch();
        } else {
            $dispatcher->releaseDirected($doctor->id);
        }

        return ApiResponse::ok($this->row($doctor));
    }

    /**
     * kind=now: available from now for `hours` (1–12); kind=tonight: 20:00–08:00 local (or from now if
     * later); kind=scheduled: explicit starts_at/ends_at (max 24 h). Windows always end on their own.
     */
    public function addAvailability(AddAvailabilityRequest $request): JsonResponse
    {
        $doctor = $request->doctor();
        $profile = $doctor->volunteerProfile()->where('status', 'active')->first()
            ?? throw BusinessRuleException::unprocessable('not_volunteer', __('urgent.not_volunteer'));
        $data = $request->validated();

        $tz = $doctor->timezone;
        [$start, $end] = match ($data['kind']) {
            'now' => [CarbonImmutable::now(), CarbonImmutable::now()->addHours((int) $data['hours'])],
            'tonight' => (function () use ($tz) {
                $tonight = CarbonImmutable::now($tz)->setTime(20, 0);
                $start = CarbonImmutable::now()->max($tonight->utc());

                return [$start, $tonight->addDay()->setTime(8, 0)->utc()];
            })(),
            default => [CarbonImmutable::parse($data['starts_at']), CarbonImmutable::parse($data['ends_at'])], // 'scheduled'
        };
        if ($start->diffInHours($end) > 24) {
            throw BusinessRuleException::unprocessable('validation_failed', __('urgent.window_too_long'),
                ['ends_at' => [__('urgent.window_too_long')]]);
        }

        VolunteerAvailability::create([
            'volunteer_profile_id' => $profile->id, 'starts_at' => $start, 'ends_at' => $end,
            'mode' => $data['mode'], 'kind' => $data['kind'],
        ]);
        $profile->update(['last_availability_update_at' => now()]);
        MatchWaitingUrgentRequestsJob::dispatch();

        return ApiResponse::created($this->row($doctor));
    }

    /** "Unavailable": end every current/future window now; requests directed to this doctor fall back to broadcast. */
    public function clearAvailability(Request $request, UrgentDispatcher $dispatcher): JsonResponse
    {
        $doctor = $this->doctor($request);
        $profile = $doctor->volunteerProfile;
        if ($profile) {
            self::endWindows($profile);
            $profile->update(['last_availability_update_at' => now()]);
            $dispatcher->releaseDirected($doctor->id);
        }

        return ApiResponse::ok($this->row($doctor));
    }

    /** Windows not yet started are removed; running ones are cut short at "now". */
    private static function endWindows(VolunteerProfile $profile): void
    {
        $profile->availabilities()->where('starts_at', '>=', now())->delete();
        $profile->availabilities()->where('starts_at', '<', now())->where('ends_at', '>', now())->update(['ends_at' => now()]);
    }

    private function row(DoctorProfile $doctor): array
    {
        $p = VolunteerProfile::with(['specialties', 'locations.governorate', 'locations.city',
            'availabilities' => fn ($q) => $q->where('ends_at', '>', now())->orderBy('starts_at')])
            ->where('doctor_profile_id', $doctor->id)->first();

        return [
            'eligible' => $doctor->isPubliclyVisible(),
            'opted_in' => $p?->status === 'active',
            'accepts_online' => $p->accepts_online ?? true,
            'accepts_in_person' => $p->accepts_in_person ?? false,
            'max_concurrent_requests' => $p->max_concurrent_requests ?? 1,
            'last_availability_update_at' => $p?->last_availability_update_at?->toIso8601String(),
            'available_now' => (bool) $p?->availabilities->first(fn ($a) => $a->starts_at <= now() && $a->ends_at > now()),
            'specialties' => $p ? $p->specialties->map->only(['id', 'slug', 'name_ar', 'name_en'])->values() : [],
            'locations' => $p ? $p->locations->map(fn ($l) => [
                'governorate' => $l->governorate->only(['id', 'name_ar', 'name_en']),
                'city' => $l->city?->only(['id', 'name_ar', 'name_en']),
            ])->values() : [],
            'windows' => $p ? $p->availabilities->map(fn ($a) => [
                'id' => $a->id, 'kind' => $a->kind, 'mode' => $a->mode,
                'starts_at' => $a->starts_at->toIso8601String(), 'ends_at' => $a->ends_at->toIso8601String(),
            ])->values() : [],
        ];
    }
}
