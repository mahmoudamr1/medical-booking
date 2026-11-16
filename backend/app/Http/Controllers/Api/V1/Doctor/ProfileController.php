<?php

namespace App\Http\Controllers\Api\V1\Doctor;

use App\Actions\Doctors\ReviewDoctorVerification;
use App\Enums\VerificationStatus;
use App\Exceptions\BusinessRuleException;
use App\Http\Requests\Doctor\UpdateDoctorProfileRequest;
use App\Http\Requests\Doctor\UpdateSpecialtiesRequest;
use App\Http\Requests\Doctor\UploadAvatarRequest;
use App\Http\Resources\DoctorSelfResource;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class ProfileController extends DoctorController
{
    public function show(Request $request): JsonResponse
    {
        return ApiResponse::ok($this->resource($request));
    }

    public function update(UpdateDoctorProfileRequest $request): JsonResponse
    {
        $doctor = $request->doctor();
        $data = $request->validated();

        // Verified credentials change only through the admin-controlled verification workflow.
        $locked = in_array($doctor->verification_status, [VerificationStatus::Pending, VerificationStatus::Approved, VerificationStatus::Suspended], true);
        if ($locked && array_key_exists('license_number', $data) && $data['license_number'] !== $doctor->license_number) {
            throw BusinessRuleException::unprocessable('locked_fields', __('doctors.verification.locked_fields'),
                ['license_number' => [__('doctors.verification.locked_fields')]]);
        }

        $doctor->update($data);

        return ApiResponse::ok($this->resource($request));
    }

    public function specialties(UpdateSpecialtiesRequest $request): JsonResponse
    {
        $doctor = $request->doctor();
        $data = $request->validated();

        if ($doctor->verification_status === VerificationStatus::Pending) {
            throw BusinessRuleException::conflict('locked_fields', __('doctors.verification.locked_fields'));
        }

        DB::transaction(function () use ($doctor, $data, $request) {
            $doctor->specialties()->sync($request->collect('specialty_ids')
                ->mapWithKeys(fn ($id) => [$id => ['is_primary' => $id === $data['primary_id']]])->all());
        });

        return ApiResponse::ok($this->resource($request));
    }

    public function avatar(UploadAvatarRequest $request): JsonResponse
    {
        $doctor = $request->doctor();
        $path = $request->file('avatar')->store('avatars', 'public');
        if ($doctor->avatar_path) {
            Storage::disk('public')->delete($doctor->avatar_path);
        }
        $doctor->forceFill(['avatar_path' => $path])->save();

        return ApiResponse::ok($this->resource($request));
    }

    public function submitVerification(Request $request, ReviewDoctorVerification $verification): JsonResponse
    {
        $verification->submit($this->doctor($request));

        return ApiResponse::ok($this->resource($request), __('doctors.verification.submitted'));
    }

    private function resource(Request $request): DoctorSelfResource
    {
        return new DoctorSelfResource($this->doctor($request)->load([
            'user', 'specialties', 'documents',
            'branches' => fn ($q) => $q->with(['clinic', 'city', 'governorate']),
        ]));
    }
}
