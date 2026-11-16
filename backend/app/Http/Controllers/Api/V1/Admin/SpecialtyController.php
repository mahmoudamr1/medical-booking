<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Exceptions\BusinessRuleException;
use App\Http\Controllers\Api\V1\Public\DirectoryController;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\SaveSpecialtyRequest;
use App\Models\Specialty;
use App\Services\Audit\AuditLogger;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

class SpecialtyController extends Controller
{
    public function __construct(private readonly AuditLogger $audit) {}

    public function index(): JsonResponse
    {
        return ApiResponse::ok(Specialty::withCount('doctors')->orderBy('sort_order')->get()->map(fn (Specialty $s) => $this->row($s)));
    }

    public function store(SaveSpecialtyRequest $request): JsonResponse
    {
        $specialty = Specialty::create($request->validated());
        $this->audit->log('specialty.created', $specialty);
        $this->flush();

        return ApiResponse::created($this->row($specialty));
    }

    public function update(SaveSpecialtyRequest $request, Specialty $specialty): JsonResponse
    {
        $specialty->update($request->validated());
        $this->audit->log('specialty.updated', $specialty, $specialty->getChanges());
        $this->flush();

        return ApiResponse::ok($this->row($specialty));
    }

    /** Specialties in use are deactivated instead of deleted (FK restrict also guards this). */
    public function destroy(Specialty $specialty): JsonResponse
    {
        if ($specialty->doctors()->exists()) {
            throw BusinessRuleException::conflict('specialty_in_use', __('admin.specialty_in_use'));
        }
        $this->audit->log('specialty.deleted', $specialty, $specialty->only(['slug', 'name_en']));
        $specialty->delete();
        $this->flush();

        return ApiResponse::noContent();
    }

    private function row(Specialty $s): array
    {
        return $s->only(['id', 'slug', 'name_ar', 'name_en', 'description_ar', 'description_en', 'icon',
            'is_active', 'is_general_practice', 'sort_order']) + ['doctors_count' => $s->doctors_count ?? $s->doctors()->count()];
    }

    private function flush(): void
    {
        Cache::forget(DirectoryController::SPECIALTIES_CACHE_KEY);
    }
}
