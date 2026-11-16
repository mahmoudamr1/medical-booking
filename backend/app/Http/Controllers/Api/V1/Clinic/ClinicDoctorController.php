<?php

namespace App\Http\Controllers\Api\V1\Clinic;

use App\Enums\AffiliationStatus;
use App\Exceptions\BusinessRuleException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Clinic\ListClinicSchedulesRequest;
use App\Http\Requests\Clinic\StoreClinicDoctorRequest;
use App\Http\Resources\ServiceResource;
use App\Models\Clinic;
use App\Models\DoctorBranchAffiliation;
use App\Models\DoctorProfile;
use App\Models\DoctorSchedule;
use App\Models\MedicalService;
use App\Services\Audit\AuditLogger;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Doctors affiliated with this clinic's branches, their services and schedules (tenant-scoped). */
class ClinicDoctorController extends Controller
{
    public function __construct(private readonly AuditLogger $audit) {}

    public function index(Clinic $clinic): JsonResponse
    {
        $rows = DoctorBranchAffiliation::with(['doctorProfile.user:id,name,email', 'doctorProfile.specialties', 'branch'])
            ->where('clinic_id', $clinic->id)->orderBy('created_at')->get()
            ->map(fn (DoctorBranchAffiliation $a) => [
                'id' => $a->id,
                'status' => $a->status->value,
                'branch' => $a->branch->only(['id', 'name_ar', 'name_en']),
                'doctor' => [
                    'id' => $a->doctorProfile->id,
                    'name' => $a->doctorProfile->user->name,
                    'email' => $a->doctorProfile->user->email,
                    'title_ar' => $a->doctorProfile->title_ar,
                    'title_en' => $a->doctorProfile->title_en,
                    'verification_status' => $a->doctorProfile->verification_status->value,
                    'specialties' => $a->doctorProfile->specialties->map->only(['id', 'name_ar', 'name_en'])->values(),
                ],
            ]);

        return ApiResponse::ok($rows);
    }

    public function store(StoreClinicDoctorRequest $request, Clinic $clinic): JsonResponse
    {
        $data = $request->validated();
        $branch = $clinic->branches()->findOrFail($data['clinic_branch_id']);
        $doctor = DoctorProfile::whereHas('user', fn ($q) => $q->where('email', mb_strtolower($data['doctor_email'])))->first()
            ?? throw BusinessRuleException::unprocessable('doctor_not_found', __('clinic.doctor_not_found'),
                ['doctor_email' => [__('clinic.doctor_not_found')]]);

        $affiliation = DoctorBranchAffiliation::updateOrCreate(
            ['doctor_profile_id' => $doctor->id, 'clinic_branch_id' => $branch->id],
            ['clinic_id' => $clinic->id, 'status' => AffiliationStatus::Active],
        );
        $this->audit->log('clinic.doctor.affiliated', $affiliation, ['clinic_id' => $clinic->id, 'doctor_profile_id' => $doctor->id]);

        return ApiResponse::created(['id' => $affiliation->id, 'status' => $affiliation->status->value]);
    }

    /** Ending an affiliation deactivates the doctor's services at that branch; history is kept. */
    public function destroy(Clinic $clinic, string $affiliation): JsonResponse
    {
        $model = DoctorBranchAffiliation::where('clinic_id', $clinic->id)->findOrFail($affiliation);
        $model->update(['status' => AffiliationStatus::Ended]);
        MedicalService::where('doctor_profile_id', $model->doctor_profile_id)
            ->where('clinic_branch_id', $model->clinic_branch_id)->update(['is_active' => false]);
        DoctorSchedule::where('doctor_profile_id', $model->doctor_profile_id)
            ->where('clinic_branch_id', $model->clinic_branch_id)->update(['is_active' => false]);
        $this->audit->log('clinic.doctor.ended', $model, ['clinic_id' => $clinic->id]);

        return ApiResponse::noContent();
    }

    /** ?active=1 → only active services (e.g. for booking on behalf); default lists all for management. */
    public function services(Request $request, Clinic $clinic): JsonResponse
    {
        return ApiResponse::ok(ServiceResource::collection(
            MedicalService::with('branch')->where('clinic_id', $clinic->id)
                ->when($request->boolean('active'), fn ($q) => $q->where('is_active', true))
                ->orderBy('price')->get()));
    }

    public function schedules(ListClinicSchedulesRequest $request, Clinic $clinic): JsonResponse
    {
        $branchIds = $clinic->branches()->pluck('id');

        return ApiResponse::ok(DoctorSchedule::with(['breaks', 'doctorProfile.user:id,name'])
            ->whereIn('clinic_branch_id', $branchIds)
            ->when($request->validated('doctor_id'), fn ($q, $id) => $q->where('doctor_profile_id', $id))
            ->orderBy('day_of_week')->orderBy('starts_at')->get()
            ->map(fn (DoctorSchedule $s) => [
                'id' => $s->id,
                'doctor' => ['id' => $s->doctor_profile_id, 'name' => $s->doctorProfile->user->name],
                'clinic_branch_id' => $s->clinic_branch_id,
                'day_of_week' => $s->day_of_week,
                'starts_at' => substr($s->starts_at, 0, 5),
                'ends_at' => substr($s->ends_at, 0, 5),
                'is_active' => $s->is_active,
                'breaks' => $s->breaks->map(fn ($b) => ['starts_at' => substr($b->starts_at, 0, 5), 'ends_at' => substr($b->ends_at, 0, 5)]),
            ]));
    }
}
