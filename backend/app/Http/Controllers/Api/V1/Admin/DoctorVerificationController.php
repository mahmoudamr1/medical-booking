<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Actions\Doctors\ReviewDoctorVerification;
use App\Http\Controllers\Api\V1\Doctor\DocumentController;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\DecideVerificationRequest;
use App\Http\Requests\Admin\ListDoctorVerificationsRequest;
use App\Http\Resources\DoctorSelfResource;
use App\Models\DoctorProfile;
use App\Services\Audit\AuditLogger;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DoctorVerificationController extends Controller
{
    public function index(ListDoctorVerificationsRequest $request): JsonResponse
    {
        $filters = $request->validated();
        $page = DoctorProfile::query()
            ->with(['user', 'specialties'])
            ->when($filters['verification_status'] ?? null, fn ($q, $s) => $q->where('verification_status', $s))
            ->when($filters['q'] ?? null, fn ($q, $term) => $q->whereHas('user', fn ($u) => $u
                ->where('name', 'ILIKE', '%'.$term.'%')->orWhere('email', 'ILIKE', '%'.$term.'%')))
            ->orderByRaw("verification_status = 'pending' DESC")
            ->orderByDesc('verification_submitted_at')
            ->paginate($filters['per_page'] ?? 20);

        return ApiResponse::ok(DoctorSelfResource::collection($page));
    }

    public function show(string $doctor): JsonResponse
    {
        $profile = DoctorProfile::with(['user', 'specialties', 'documents', 'branches.clinic'])->findOrFail($doctor);

        return ApiResponse::ok(new DoctorSelfResource($profile));
    }

    public function decide(DecideVerificationRequest $request, string $doctor, string $decision, ReviewDoctorVerification $review): JsonResponse
    {
        abort_unless(in_array($decision, ['approve', 'reject', 'suspend', 'reinstate'], true), 404);
        $profile = $review->review(DoctorProfile::with('user')->findOrFail($doctor), $decision, $request->user(), $request->validated('notes'));

        return ApiResponse::ok(new DoctorSelfResource($profile->load(['user', 'specialties', 'documents'])), __('doctors.verification.reviewed'));
    }

    /** Sensitive access to private documents is audit-logged. */
    public function document(string $doctor, string $document, AuditLogger $audit): StreamedResponse
    {
        $doc = DoctorProfile::findOrFail($doctor)->documents()->findOrFail($document);
        $audit->log('doctor.document.viewed', $doc, ['doctor_profile_id' => $doctor]);

        return DocumentController::stream($doc);
    }
}
