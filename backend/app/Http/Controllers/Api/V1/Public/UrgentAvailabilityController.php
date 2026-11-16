<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Controller;
use App\Http\Requests\Public\ListAvailableDoctorsRequest;
use App\Http\Resources\AvailableDoctorResource;
use App\Services\Urgent\VolunteerMatcher;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

/** Live list of doctors taking urgent consultations right now (public fields only, never cached). */
class UrgentAvailabilityController extends Controller
{
    public function __invoke(ListAvailableDoctorsRequest $request, VolunteerMatcher $matcher): JsonResponse
    {
        $filters = $request->filters();

        return ApiResponse::ok([
            'count' => $matcher->availableNow($filters)->count(),
            'doctors' => AvailableDoctorResource::collection($matcher->listAvailable($filters))->resolve($request),
        ]);
    }
}
