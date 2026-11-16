<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\UrgentSeverity;
use App\Enums\UrgentStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\AvailableDoctorResource;
use App\Http\Resources\UrgentRequestResource;
use App\Models\UrgentRequest;
use App\Services\Urgent\VolunteerMatcher;
use App\Support\ApiResponse;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Admin live board of the urgent service: who is available now and what is waiting. */
class UrgentLiveController extends Controller
{
    public const OPEN_REQUESTS_LIMIT = 50;

    public function __invoke(Request $request, VolunteerMatcher $matcher): JsonResponse
    {
        $matching = fn () => UrgentRequest::whereIn('status', UrgentStatus::MATCHING);
        $bySeverity = $matching()->selectRaw('severity, count(*) as n')->groupBy('severity')->pluck('n', 'severity');
        $oldest = $matching()->min('created_at');
        $startOfToday = CarbonImmutable::now(config('app.business_timezone'))->startOfDay()->utc();
        $avgToAccept = UrgentRequest::where('accepted_at', '>=', $startOfToday)
            ->selectRaw('avg(extract(epoch from (accepted_at - created_at))) as seconds')->value('seconds');

        $openRequests = UrgentRequest::with(UrgentRequestResource::ADMIN_RELATIONS)
            ->whereIn('status', UrgentStatus::OPEN)
            ->orderByRaw(UrgentSeverity::rankSql('urgent_requests.severity'))->oldest()
            ->limit(self::OPEN_REQUESTS_LIMIT)->get();

        return ApiResponse::ok([
            'available_doctors' => $matcher->availableNow()->count(),
            'open' => collect(UrgentSeverity::cases())
                ->mapWithKeys(fn (UrgentSeverity $s) => [$s->value => (int) ($bySeverity[$s->value] ?? 0)]),
            'oldest_waiting_seconds' => $oldest !== null
                ? (int) CarbonImmutable::parse($oldest)->diffInSeconds(now(), true) : 0,
            // null when nobody was accepted today: an average of nothing is not shown as 0.
            'avg_time_to_accept_seconds_today' => $avgToAccept !== null ? (int) round((float) $avgToAccept) : null,
            'unmatched_last_24h' => UrgentRequest::where('status', UrgentStatus::Unmatched->value)
                ->where('closed_at', '>=', now()->subDay())->count(),
            'flagged_open' => UrgentRequest::whereIn('status', UrgentStatus::OPEN)->whereNotNull('flagged_at')->count(),
            'doctors' => AvailableDoctorResource::collection($matcher->listAvailable())->resolve($request),
            'open_requests' => $openRequests->map(fn (UrgentRequest $r) => (new UrgentRequestResource($r))
                ->viewerRole('admin')->resolve($request))->values(),
        ]);
    }
}
