<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Controller;
use App\Http\Resources\DoctorCardResource;
use App\Http\Resources\SpecialtyResource;
use App\Models\Appointment;
use App\Models\Clinic;
use App\Models\DoctorProfile;
use App\Models\Specialty;
use App\Services\Settings;
use App\Support\ApiResponse;
use App\Support\PublicCache;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/** Homepage content, entirely from the database. Public, non-personal → safe to cache briefly. */
class HomeController extends Controller
{
    public function __invoke(Request $request, Settings $settings): JsonResponse
    {
        $data = PublicCache::remember('public.home.v2.'.app()->getLocale(), 120, function () use ($request, $settings) {
            $with = [
                'user:id,name,status', 'specialties' => fn ($q) => $q->where('is_active', true),
                'branches' => fn ($q) => $q->where('clinic_branches.is_active', true)->with(['city', 'governorate', 'clinic']),
                'services' => fn ($q) => $q->where('is_active', true),
            ];

            $recommended = DoctorProfile::publiclyVisible()->with($with)
                ->orderByDesc('rating_avg')->orderByDesc('rating_count')->orderByDesc('years_experience')->limit(8)->get();
            $availableSoon = DoctorProfile::publiclyVisible()->with($with)
                ->whereNotNull('next_available_at')->where('next_available_at', '<', now()->addDay())
                ->orderBy('next_available_at')->limit(8)->get();

            $featuredClinics = Clinic::active()->where('is_personal_practice', false)
                ->whereHas('branches', fn ($q) => $q->where('is_active', true))
                ->withCount(['branches' => fn ($q) => $q->where('is_active', true)])
                ->orderByDesc('branches_count')->limit(6)->get()
                ->map(fn (Clinic $c) => $c->only(['id', 'slug', 'name_ar', 'name_en']) + ['branches_count' => $c->branches_count]);

            // Most-booked active services by name, from real appointment data.
            $popular = DB::table('medical_services')
                ->join('appointments', 'appointments.medical_service_id', '=', 'medical_services.id')
                ->where('medical_services.is_active', true)
                ->groupBy('medical_services.name_ar', 'medical_services.name_en', 'medical_services.consultation_type')
                ->orderByDesc(DB::raw('count(*)'))
                ->limit(6)
                ->get([
                    'medical_services.name_ar', 'medical_services.name_en', 'medical_services.consultation_type',
                    DB::raw('count(*) as bookings'), DB::raw('min(medical_services.price) as from_price'),
                ])->map(fn (object $s) => [
                    'name_ar' => $s->name_ar, 'name_en' => $s->name_en,
                    'consultation_type' => $s->consultation_type,
                    'bookings' => (int) $s->bookings, 'from_price' => (float) $s->from_price,
                ]);

            return [
                'specialties' => SpecialtyResource::collection(
                    Specialty::active()->withCount(['doctors' => fn ($q) => $q->publiclyVisible()])->get())->resolve($request),
                'recommended_doctors' => DoctorCardResource::collection($recommended)->resolve($request),
                'available_soon' => DoctorCardResource::collection($availableSoon)->resolve($request),
                'featured_clinics' => $featuredClinics,
                'popular_services' => $popular,
                'stats' => [
                    'doctors' => DoctorProfile::publiclyVisible()->count(),
                    'specialties' => Specialty::where('is_active', true)->count(),
                    'clinics' => Clinic::active()->count(),
                    'completed_visits' => Appointment::where('status', 'completed')->count(),
                ],
                'urgent' => [
                    'enabled' => (bool) $settings->get('urgent_enabled'),
                ],
            ];
        });

        return ApiResponse::ok($data);
    }

    public function settings(Settings $settings): JsonResponse
    {
        return ApiResponse::ok([
            'urgent_enabled' => (bool) $settings->get('urgent_enabled'),
            'currency' => 'EGP',
            'timezone' => config('app.business_timezone'),
            'locales' => ['ar', 'en'],
        ]);
    }
}
