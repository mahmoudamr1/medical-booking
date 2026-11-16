<?php

namespace App\Services\Urgent;

use App\Enums\UrgentSeverity;
use App\Enums\UrgentStatus;
use App\Models\DoctorProfile;
use App\Models\UrgentRequest;
use App\Models\VolunteerProfile;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

/**
 * Who can take an urgent consultation right now, and who is notified at each dispatch step.
 *
 * availableNow() is THE eligibility query (public list, admin live board, clinic view and
 * dispatching all build on it):
 *  - doctor publicly visible (verified + active + account active),
 *  - explicit volunteer opt-in with status active,
 *  - a CURRENT availability window (starts_at <= now < ends_at) whose mode the volunteer accepts,
 *  - current workload (accepted/in-progress urgent requests) below max_concurrent_requests.
 *
 * eligible() adds, per dispatch step, "not already dispatched for this request", "not the
 * requesting patient", the request's consultation mode, and:
 *  0. directed: only the doctor the patient picked (in person: must cover the governorate)
 *  critical (tier ≥ 1): one wave, any specialty incl. GP; online nationwide, in person same governorate
 *  1. requested specialty + coverage in the same city (or area)
 *  2. requested specialty + coverage anywhere in the same governorate (online: anywhere)
 *  3. general practitioners in the same governorate (online: anywhere) — disclosed to the patient
 * If the patient didn't pick a specialty, tiers 1–2 accept any specialty.
 */
final class VolunteerMatcher
{
    public const MAX_PER_TIER = 25;

    /** Safety cap for the single critical wave (the wave is meant to reach everyone eligible). */
    public const MAX_CRITICAL_WAVE = 200;

    /** Highest dispatch step for a request: critical requests have a single broadcast wave. */
    public static function lastTier(UrgentRequest $request): int
    {
        return $request->severity === UrgentSeverity::Critical ? 1 : 3;
    }

    /**
     * Publicly visible doctors with an active volunteer opt-in, whether or not available right now.
     *
     * @return Builder<DoctorProfile>
     */
    public function volunteers(): Builder
    {
        return DoctorProfile::publiclyVisible()
            ->whereHas('volunteerProfile', fn (Builder $v) => $v->where('volunteer_profiles.status', 'active'));
    }

    /**
     * Doctors who can take an urgent consultation right now. `specialty` accepts an id or a slug;
     * without `mode`, a doctor qualifies through either mode.
     *
     * @param  array{mode?: string|null, specialty?: string|null, governorate_id?: string|null}  $filters
     * @return Builder<DoctorProfile>
     */
    public function availableNow(array $filters = []): Builder
    {
        $mode = $filters['mode'] ?? null;
        $specialty = $filters['specialty'] ?? null;
        $governorate = $filters['governorate_id'] ?? null;

        return $this->volunteers()
            ->whereHas('volunteerProfile', function (Builder $v) use ($mode, $specialty, $governorate) {
                $v->where(function (Builder $w) use ($mode) {
                    foreach ($mode !== null ? [$mode] : ['online', 'in_person'] as $m) {
                        $w->orWhere(fn (Builder $one) => $this->servesMode($one, $m));
                    }
                })
                    // Workload: active urgent requests strictly below the volunteer's limit.
                    ->whereRaw('(select count(*) from urgent_requests ur where ur.accepted_doctor_profile_id = volunteer_profiles.doctor_profile_id
                        and ur.status in (?, ?)) < volunteer_profiles.max_concurrent_requests', UrgentStatus::ACTIVE_WITH_DOCTOR);

                if ($specialty !== null) {
                    $v->whereHas('specialties', fn (Builder $s) => $s->where(fn (Builder $w) => $w
                        ->where('specialties.id', $specialty)->orWhere('specialties.slug', $specialty)));
                }
                if ($governorate !== null) {
                    $v->whereHas('locations', fn (Builder $l) => $l->where('governorate_id', $governorate));
                }
            });
    }

    /**
     * Everything AvailableDoctorResource renders: volunteer specialties/coverage, the current
     * windows, and the live workload as `urgent_active`.
     *
     * @param  Builder<DoctorProfile>  $query
     * @return Builder<DoctorProfile>
     */
    public function withLiveDetails(Builder $query): Builder
    {
        return $query->with([
            'user', 'volunteerProfile.specialties', 'volunteerProfile.locations.city', 'volunteerProfile.locations.governorate',
            'volunteerProfile.availabilities' => fn ($a) => $a->current(),
        ])->addSelect(['urgent_active' => UrgentRequest::query()->selectRaw('count(*)')
            ->whereColumn('urgent_requests.accepted_doctor_profile_id', 'doctor_profiles.id')
            ->whereIn('urgent_requests.status', UrgentStatus::ACTIVE_WITH_DOCTOR)]);
    }

    /**
     * Available doctors with live details, best rated first.
     *
     * @param  array{mode?: string|null, specialty?: string|null, governorate_id?: string|null}  $filters
     * @return Collection<int, DoctorProfile>
     */
    public function listAvailable(array $filters = [], int $limit = 100): Collection
    {
        return $this->withLiveDetails($this->availableNow($filters))
            ->orderByDesc('doctor_profiles.rating_avg')->orderBy('doctor_profiles.id')
            ->limit($limit)->get();
    }

    /** @return Collection<int, DoctorProfile> */
    public function eligible(UrgentRequest $request, int $tier): Collection
    {
        if ($tier === 0 && $request->preferred_doctor_profile_id === null) {
            return collect();
        }
        $online = $request->consultation_type === 'online';
        $critical = $tier >= 1 && $request->severity === UrgentSeverity::Critical;

        $query = $this->availableNow(['mode' => $online ? 'online' : 'in_person'])
            ->whereHas('volunteerProfile', function (Builder $v) use ($request, $tier, $online, $critical) {
                // Specialty: directed and critical requests accept any specialty.
                if ($tier === 3 && ! $critical) {
                    $v->whereHas('specialties', fn (Builder $s) => $s->where('is_general_practice', true));
                } elseif ($tier !== 0 && ! $critical && $request->specialty_id) {
                    $v->whereHas('specialties', fn (Builder $s) => $s->where('specialties.id', $request->specialty_id));
                }

                // Geography: online is nationwide beyond tier 1; in person stays within the governorate.
                if ($tier === 1 && ! $critical) {
                    $v->whereHas('locations', fn (Builder $l) => $l->where('governorate_id', $request->governorate_id)
                        ->where(fn (Builder $w) => $request->city_id
                            ? $w->where('city_id', $request->city_id)->orWhereNull('city_id')
                            : $w->whereNull('city_id')));
                } elseif (! $online) {
                    $v->whereHas('locations', fn (Builder $l) => $l->where('governorate_id', $request->governorate_id));
                }
            })
            ->when($tier === 0, fn (Builder $q) => $q->whereKey($request->preferred_doctor_profile_id))
            ->whereNotIn('doctor_profiles.id', fn ($q) => $q->select('doctor_profile_id')
                ->from('urgent_request_dispatches')->where('urgent_request_id', $request->id))
            ->where('doctor_profiles.user_id', '<>', $request->patientProfile->user_id)
            ->orderBy('doctor_profiles.rating_avg', 'desc')
            ->limit($critical ? self::MAX_CRITICAL_WAVE : self::MAX_PER_TIER);

        return $query->with('user')->get();
    }

    /**
     * The volunteer accepts $mode and has a current window covering it.
     *
     * @param  Builder<VolunteerProfile>  $volunteer
     */
    private function servesMode(Builder $volunteer, string $mode): void
    {
        $volunteer->where($mode === 'online' ? 'accepts_online' : 'accepts_in_person', true)
            ->whereHas('availabilities', fn (Builder $a) => $a->current()->whereIn('mode', [$mode, 'both']));
    }
}
