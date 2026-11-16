<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Controller;
use App\Http\Requests\Public\DoctorSearchRequest;
use App\Http\Resources\DoctorCardResource;
use App\Http\Resources\DoctorPublicResource;
use App\Http\Resources\ServiceResource;
use App\Models\DoctorProfile;
use App\Services\Search\DoctorSearch;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DoctorController extends Controller
{
    public function index(DoctorSearchRequest $request, DoctorSearch $search): JsonResponse
    {
        $page = $search->paginate($request->validated(), (int) $request->integer('per_page', 12));

        return ApiResponse::ok(DoctorCardResource::collection($page));
    }

    public function show(string $doctor): JsonResponse
    {
        return ApiResponse::ok(new DoctorPublicResource($this->findPublic($doctor)));
    }

    public function services(string $doctor): JsonResponse
    {
        $profile = $this->findPublic($doctor);

        return ApiResponse::ok(ServiceResource::collection($profile->services->where('is_active', true)->values()));
    }

    /** Avatars are public images, but only for publicly visible doctors. */
    public function avatar(string $doctor): StreamedResponse
    {
        $profile = $this->findPublic($doctor);
        abort_unless($profile->avatar_path && Storage::disk('public')->exists($profile->avatar_path), 404);

        // CSP blocks any script inside image files (incl. generated SVG demo avatars).
        return Storage::disk('public')->response($profile->avatar_path, null, ['Cache-Control' => 'public, max-age=86400', 'Content-Security-Policy' => "default-src 'none'; style-src 'unsafe-inline'", 'X-Content-Type-Options' => 'nosniff']);
    }

    /** Unverified/suspended doctors are indistinguishable from non-existent ones. */
    private function findPublic(string $id): DoctorProfile
    {
        return DoctorProfile::publiclyVisible()
            ->with([
                'user:id,name,status',
                'specialties' => fn ($q) => $q->where('is_active', true),
                'branches' => fn ($q) => $q->where('clinic_branches.is_active', true)
                    ->whereHas('clinic', fn ($c) => $c->active())
                    ->with(['governorate', 'city', 'area', 'clinic', 'hours']),
                'services' => fn ($q) => $q->where('is_active', true)->with('branch.city'),
            ])
            ->findOrFail($id);
    }
}
