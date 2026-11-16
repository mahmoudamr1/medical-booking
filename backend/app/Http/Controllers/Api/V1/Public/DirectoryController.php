<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Controller;
use App\Http\Resources\LocationResource;
use App\Http\Resources\SpecialtyResource;
use App\Models\City;
use App\Models\Governorate;
use App\Models\Specialty;
use App\Support\ApiResponse;
use App\Support\PublicCache;
use Illuminate\Http\JsonResponse;

/** Relatively static public reference data, cached and invalidated on admin changes. */
class DirectoryController extends Controller
{
    public const SPECIALTIES_CACHE_KEY = 'public.specialties.v1';

    public function specialties(): JsonResponse
    {
        $data = PublicCache::remember(self::SPECIALTIES_CACHE_KEY, 3600, fn () => SpecialtyResource::collection(
            Specialty::active()->withCount(['doctors' => fn ($q) => $q->publiclyVisible()])->get()
        )->resolve());

        return ApiResponse::ok($data);
    }

    public function specialty(string $slug): JsonResponse
    {
        $specialty = Specialty::where('slug', $slug)->where('is_active', true)
            ->withCount(['doctors' => fn ($q) => $q->publiclyVisible()])
            ->firstOrFail();

        return ApiResponse::ok(new SpecialtyResource($specialty));
    }

    public function governorates(): JsonResponse
    {
        $data = PublicCache::remember('public.governorates.v1', 86400,
            fn () => LocationResource::collection(Governorate::orderBy('sort_order')->get())->resolve());

        return ApiResponse::ok($data);
    }

    public function cities(Governorate $governorate): JsonResponse
    {
        return ApiResponse::ok(LocationResource::collection($governorate->cities()->orderBy('name_en')->get()));
    }

    public function areas(City $city): JsonResponse
    {
        return ApiResponse::ok(LocationResource::collection($city->areas()->orderBy('name_en')->get()));
    }
}
