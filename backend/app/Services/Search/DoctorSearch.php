<?php

namespace App\Services\Search;

use App\Enums\AffiliationStatus;
use App\Models\DoctorProfile;
use App\Services\Scheduling\AvailabilityService;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;

/**
 * Public doctor discovery. All filtering, sorting and pagination happen in PostgreSQL.
 * Only publicly visible doctors (verified + active + active account) are ever returned.
 *
 * Filters: q, specialty (slug|id), governorate, city, area, clinic (slug|id), min_price, max_price,
 * min_rating, consultation_type, available_on (Y-m-d; doctor has ≥1 free slot that day).
 */
final class DoctorSearch
{
    public const SORTS = ['recommended', 'rating', 'price_asc', 'price_desc', 'next_available', 'experience'];

    /** Upper bound of candidates checked against the scheduling engine for "available on date". */
    public const AVAILABILITY_CANDIDATE_LIMIT = 300;

    public function __construct(private readonly AvailabilityService $availability) {}

    /**
     * @param  array<string, mixed>  $filters
     * @return Builder<DoctorProfile>
     */
    public function query(array $filters): Builder
    {
        $query = DoctorProfile::query()->publiclyVisible()->select('doctor_profiles.*');

        if ($q = trim((string) ($filters['q'] ?? ''))) {
            $normalized = ArabicNormalizer::normalize($q);
            if ($normalized !== '') {
                // Trigram-indexed partial match; also matches each token so word order doesn't matter.
                $query->where(function (Builder $w) use ($normalized) {
                    $w->where('doctor_profiles.search_text', 'ILIKE', '%'.$this->escapeLike($normalized).'%');
                    foreach (array_slice(explode(' ', $normalized), 0, 4) as $token) {
                        if (mb_strlen($token) >= 3) {
                            $w->orWhereRaw('word_similarity(?, doctor_profiles.search_text) > 0.5', [$token]);
                        }
                    }
                });
            }
        }

        if ($specialty = $filters['specialty'] ?? null) {
            $query->whereHas('specialties', fn (Builder $s) => $s
                ->where('specialties.is_active', true)
                ->where(fn (Builder $w) => $w->where('specialties.slug', $specialty)->orWhere('specialties.id', $specialty)));
        }

        $location = array_filter([
            'governorate_id' => $filters['governorate'] ?? null,
            'city_id' => $filters['city'] ?? null,
            'area_id' => $filters['area'] ?? null,
        ]);
        $clinic = $filters['clinic'] ?? null;
        if ($location || $clinic) {
            $query->whereHas('affiliations', function (Builder $a) use ($location, $clinic) {
                $a->where('doctor_branch_affiliations.status', AffiliationStatus::Active->value)
                    ->whereHas('branch', function (Builder $b) use ($location) {
                        $b->where('is_active', true);
                        foreach ($location as $column => $value) {
                            $b->where($column, $value);
                        }
                    });
                if ($clinic) {
                    $a->whereHas('clinic', fn (Builder $c) => $c->active()
                        ->where(fn (Builder $w) => $w->where('clinics.slug', $clinic)->orWhere('clinics.id', $clinic)));
                }
            });
        }

        $minPrice = $filters['min_price'] ?? null;
        $maxPrice = $filters['max_price'] ?? null;
        $type = $filters['consultation_type'] ?? null;
        if ($minPrice !== null || $maxPrice !== null || $type) {
            $query->whereHas('services', function (Builder $s) use ($minPrice, $maxPrice, $type) {
                $s->where('is_active', true);
                if ($minPrice !== null) {
                    $s->where('price', '>=', $minPrice);
                }
                if ($maxPrice !== null) {
                    $s->where('price', '<=', $maxPrice);
                }
                if ($type) {
                    $s->where('consultation_type', $type);
                }
            });
        }

        if (($minRating = $filters['min_rating'] ?? null) !== null) {
            $query->where('doctor_profiles.rating_avg', '>=', $minRating);
        }

        return $this->sort($query, $filters['sort'] ?? 'recommended');
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return LengthAwarePaginator<int, DoctorProfile>
     */
    public function paginate(array $filters, int $perPage = 12): LengthAwarePaginator
    {
        $query = $this->query($filters);

        // "Available on date" uses the real engine (schedules, exceptions, existing bookings),
        // applied to the already-filtered candidate set before pagination.
        if ($date = $filters['available_on'] ?? null) {
            // Cheap SQL pre-filter: works that weekday (or has custom hours that date) and isn't closed that date.
            $dow = (int) CarbonImmutable::parse($date, config('app.business_timezone'))->dayOfWeek;
            $query->where(fn (Builder $w) => $w
                ->whereExists(fn ($s) => $s->from('doctor_schedules')->whereColumn('doctor_schedules.doctor_profile_id', 'doctor_profiles.id')
                    ->where('doctor_schedules.day_of_week', $dow)->where('doctor_schedules.is_active', true))
                ->orWhereExists(fn ($s) => $s->from('schedule_exceptions')->whereColumn('schedule_exceptions.doctor_profile_id', 'doctor_profiles.id')
                    ->where('schedule_exceptions.date', $date)->where('schedule_exceptions.type', 'custom_hours')))
                ->whereNotExists(fn ($s) => $s->from('schedule_exceptions')->whereColumn('schedule_exceptions.doctor_profile_id', 'doctor_profiles.id')
                    ->where('schedule_exceptions.date', $date)->where('schedule_exceptions.type', 'closed')->whereNull('schedule_exceptions.clinic_branch_id'));

            $candidates = (clone $query)->with(['user', 'services' => fn ($q) => $q->where('is_active', true)->with('branch.clinic')])
                ->limit(self::AVAILABILITY_CANDIDATE_LIMIT)->get();
            $ids = $candidates->filter(fn (DoctorProfile $d) => $d->services->contains(
                fn ($service) => ($this->availability->slots($d, $service, $date, $date)[$date] ?? []) !== []
            ))->pluck('id');
            $query->whereIn('doctor_profiles.id', $ids);
        }

        return $query
            ->with([
                'user:id,name,status',
                'specialties' => fn ($q) => $q->where('is_active', true),
                'branches' => fn ($q) => $q->where('clinic_branches.is_active', true)->with(['governorate', 'city', 'area', 'clinic']),
                'services' => fn ($q) => $q->where('is_active', true),
            ])
            ->paginate(min(max($perPage, 1), 50))
            ->withQueryString();
    }

    /**
     * @param  Builder<DoctorProfile>  $query
     * @return Builder<DoctorProfile>
     */
    private function sort(Builder $query, string $sort): Builder
    {
        $sorted = match ($sort) {
            'rating' => $query->orderByDesc('rating_avg')->orderByDesc('rating_count'),
            'price_asc' => $query->orderByRaw('min_price ASC NULLS LAST'),
            'price_desc' => $query->orderByRaw('min_price DESC NULLS LAST'),
            'next_available' => $query->orderByRaw('next_available_at ASC NULLS LAST'),
            'experience' => $query->orderByDesc('years_experience'),
            // Recommended: bookable soon, well-rated, then experience.
            default => $query->orderByDesc('accepts_bookings')
                ->orderByRaw('next_available_at ASC NULLS LAST')
                ->orderByDesc('rating_avg')
                ->orderByDesc('years_experience'),
        };

        // Stable tiebreaker so pagination never repeats or skips rows.
        return $sorted->orderBy('doctor_profiles.id');
    }

    private function escapeLike(string $value): string
    {
        return str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $value);
    }
}
