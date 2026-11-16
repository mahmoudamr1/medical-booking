<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Enums\AffiliationStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Public\ListClinicsRequest;
use App\Http\Resources\BranchResource;
use App\Http\Resources\DoctorCardResource;
use App\Http\Resources\ServiceResource;
use App\Models\Clinic;
use App\Models\DoctorProfile;
use App\Models\MedicalService;
use App\Services\Search\ArabicNormalizer;
use App\Support\ApiResponse;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ClinicDirectoryController extends Controller
{
    public function index(ListClinicsRequest $request): JsonResponse
    {
        $filters = $request->validated();

        $query = Clinic::active()
            // Only list organizations with at least one active branch.
            ->whereHas('branches', function (Builder $b) use ($filters) {
                $b->where('is_active', true);
                if ($filters['governorate'] ?? null) {
                    $b->where('governorate_id', $filters['governorate']);
                }
                if ($filters['city'] ?? null) {
                    $b->where('city_id', $filters['city']);
                }
            })
            ->withCount(['affiliations as doctors_count' => fn ($q) => $q
                ->where('status', AffiliationStatus::Active->value)
                ->whereHas('doctorProfile', fn ($d) => $d->publiclyVisible())])
            ->with(['branches' => fn ($q) => $q->where('is_active', true)->with(['governorate', 'city'])]);

        if ($type = $filters['type'] ?? null) {
            $query->where('type', $type);
        }

        if ($q = trim((string) ($filters['q'] ?? ''))) {
            $like = '%'.str_replace(['%', '_'], ['\%', '\_'], $q).'%';
            $query->where(fn (Builder $w) => $w->where('name_ar', 'ILIKE', $like)->orWhere('name_en', 'ILIKE', $like)
                ->orWhereRaw('word_similarity(?, name_ar) > 0.5', [ArabicNormalizer::normalize($q)]));
        }

        $page = $query->orderBy('is_personal_practice')->orderBy('name_en')->paginate($filters['per_page'] ?? 12);
        $page->getCollection()->transform(fn (Clinic $c) => $this->summary($c, $request));

        return ApiResponse::paginated($page);
    }

    public function show(Request $request, string $slug): JsonResponse
    {
        $clinic = Clinic::active()->where('slug', $slug)
            ->with(['branches' => fn ($q) => $q->where('is_active', true)->with(['governorate', 'city', 'area', 'hours'])])
            ->withCount(['affiliations as doctors_count' => fn ($q) => $q
                ->where('status', AffiliationStatus::Active->value)
                ->whereHas('doctorProfile', fn ($d) => $d->publiclyVisible())])
            ->firstOrFail();

        $doctors = DoctorProfile::publiclyVisible()
            ->whereHas('affiliations', fn ($a) => $a->where('clinic_id', $clinic->id)->where('status', AffiliationStatus::Active->value))
            ->with(['user:id,name,status', 'specialties', 'services' => fn ($q) => $q->where('is_active', true),
                'branches' => fn ($q) => $q->where('clinic_branches.clinic_id', $clinic->id)->with(['city', 'governorate', 'clinic'])])
            ->orderByDesc('rating_avg')->limit(100)->get();

        $services = MedicalService::where('clinic_id', $clinic->id)->where('is_active', true)
            ->whereIn('doctor_profile_id', $doctors->pluck('id'))
            ->with('branch')->orderBy('price')->get();

        return ApiResponse::ok($this->summary($clinic, $request) + [
            'description_ar' => $clinic->description_ar,
            'description_en' => $clinic->description_en,
            'phone' => $clinic->phone,
            'email' => $clinic->email,
            'branches' => BranchResource::collection($clinic->branches)->resolve($request),
            'doctors' => DoctorCardResource::collection($doctors)->resolve($request),
            'services' => ServiceResource::collection($services)->resolve($request),
        ]);
    }

    public function logo(string $slug): StreamedResponse
    {
        $clinic = Clinic::active()->where('slug', $slug)->firstOrFail();
        abort_unless($clinic->logo_path && Storage::disk('public')->exists($clinic->logo_path), 404);

        return Storage::disk('public')->response($clinic->logo_path, null, ['Cache-Control' => 'public, max-age=86400', 'Content-Security-Policy' => "default-src 'none'; style-src 'unsafe-inline'", 'X-Content-Type-Options' => 'nosniff']);
    }

    private function summary(Clinic $clinic, Request $request): array
    {
        return [
            'id' => $clinic->id,
            'slug' => $clinic->slug,
            'name_ar' => $clinic->name_ar,
            'name_en' => $clinic->name_en,
            'type' => $clinic->type,
            'is_personal_practice' => $clinic->is_personal_practice,
            'logo_url' => $clinic->logo_path ? route('public.clinic-logo', $clinic->slug, absolute: false) : null,
            'doctors_count' => $clinic->doctors_count ?? null,
            'branches_count' => $clinic->branches->count(),
            'cities' => $clinic->branches->map(fn ($b) => ['name_ar' => $b->city?->name_ar, 'name_en' => $b->city?->name_en])
                ->unique('name_en')->values(),
        ];
    }
}
