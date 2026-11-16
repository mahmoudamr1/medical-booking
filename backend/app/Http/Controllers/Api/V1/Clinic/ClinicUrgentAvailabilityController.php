<?php

namespace App\Http\Controllers\Api\V1\Clinic;

use App\Enums\AffiliationStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\AvailableDoctorResource;
use App\Models\Clinic;
use App\Models\DoctorBranchAffiliation;
use App\Models\DoctorProfile;
use App\Services\Urgent\VolunteerMatcher;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Read-only: which of this clinic's affiliated doctors volunteer for urgent consultations, and who is available now. */
class ClinicUrgentAvailabilityController extends Controller
{
    public function __invoke(Request $request, Clinic $clinic, VolunteerMatcher $matcher): JsonResponse
    {
        // Tenant scope: only doctors actively affiliated with THIS clinic (first branch per doctor).
        $affiliations = DoctorBranchAffiliation::with('branch')
            ->where('clinic_id', $clinic->id)->where('status', AffiliationStatus::Active->value)
            ->orderBy('created_at')->get()->unique('doctor_profile_id')->keyBy('doctor_profile_id');

        $volunteers = $matcher->withLiveDetails($matcher->volunteers()->whereIn('doctor_profiles.id', $affiliations->keys()))->get();
        $availableIds = $matcher->availableNow()->whereIn('doctor_profiles.id', $volunteers->modelKeys())
            ->pluck('doctor_profiles.id')->all();

        $doctors = $volunteers->map(fn (DoctorProfile $d) => (new AvailableDoctorResource($d))->resolve($request) + [
            'available_now' => in_array($d->id, $availableIds, true),
            'affiliated_branch' => $affiliations[$d->id]->branch->only(['id', 'name_ar', 'name_en']),
        ])->sortByDesc('available_now')->values();

        return ApiResponse::ok(['doctors' => $doctors, 'volunteers_total' => $volunteers->count()]);
    }
}
