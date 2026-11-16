<?php

namespace App\Http\Controllers\Api\V1\Clinic;

use App\Http\Controllers\Controller;
use App\Http\Requests\Clinic\SaveBranchRequest;
use App\Http\Requests\Clinic\UpdateBranchHoursRequest;
use App\Http\Resources\BranchResource;
use App\Models\Clinic;
use App\Models\ClinicBranch;
use App\Services\Audit\AuditLogger;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

/** Branch management inside the resolved tenant ($clinic comes from ResolveClinicTenant). */
class BranchController extends Controller
{
    /** Relations BranchResource shows on the management screens. */
    private const RELATIONS = ['governorate', 'city', 'area', 'hours'];

    public function __construct(private readonly AuditLogger $audit) {}

    public function index(Clinic $clinic): JsonResponse
    {
        return ApiResponse::ok(BranchResource::collection(
            $clinic->branches()->with(self::RELATIONS)->orderBy('created_at')->get()));
    }

    public function store(SaveBranchRequest $request, Clinic $clinic): JsonResponse
    {
        $branch = $clinic->branches()->create($request->branchAttributes());
        $this->audit->log('clinic.branch.created', $branch, ['clinic_id' => $clinic->id]);

        return ApiResponse::created(new BranchResource($branch->load(self::RELATIONS)));
    }

    public function update(SaveBranchRequest $request): JsonResponse
    {
        $model = $request->branch();
        $model->update($request->branchAttributes());
        $this->audit->log('clinic.branch.updated', $model, $model->getChanges());

        return ApiResponse::ok(new BranchResource($model->load(self::RELATIONS)));
    }

    /** Branches with history are deactivated, never deleted (appointments reference them). */
    public function destroy(Clinic $clinic, string $branch): JsonResponse
    {
        $model = $this->branch($clinic, $branch);
        if (DB::table('appointments')->where('clinic_branch_id', $model->id)->exists()) {
            $model->update(['is_active' => false]);
        } else {
            $model->delete();
        }
        $this->audit->log('clinic.branch.removed', $model);

        return ApiResponse::noContent();
    }

    public function hours(UpdateBranchHoursRequest $request, Clinic $clinic, string $branch): JsonResponse
    {
        $model = $this->branch($clinic, $branch);
        DB::transaction(function () use ($model, $request) {
            $model->hours()->delete();
            foreach ($request->validated('hours') as $h) {
                $model->hours()->create($h);
            }
        });

        return ApiResponse::ok(new BranchResource($model->load(self::RELATIONS)));
    }

    /** Tenant-scoped lookup: another clinic's branch id is simply not found. */
    private function branch(Clinic $clinic, string $id): ClinicBranch
    {
        return $clinic->branches()->findOrFail($id);
    }
}
