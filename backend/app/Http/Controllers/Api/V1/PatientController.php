<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Patient\UpdateConsentRequest;
use App\Http\Requests\Patient\UpdatePatientProfileRequest;
use App\Models\Consent;
use App\Models\PatientProfile;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Patient profile and consent preferences (own data only). */
class PatientController extends Controller
{
    public function profile(Request $request): JsonResponse
    {
        return ApiResponse::ok($this->row($this->patient($request)));
    }

    public function updateProfile(UpdatePatientProfileRequest $request): JsonResponse
    {
        $patient = $this->patient($request);
        $patient->update($request->validated());

        return ApiResponse::ok($this->row($patient->fresh()));
    }

    public function consents(Request $request): JsonResponse
    {
        $latest = Consent::where('user_id', $request->user()->id)->orderByDesc('created_at')->orderByDesc('id')->get()->unique('type'); // ULIDs are time-ordered

        return ApiResponse::ok(collect(Consent::TYPES)->map(fn (string $type) => [
            'type' => $type,
            'granted' => (bool) $latest->firstWhere('type', $type)?->granted,
            'updated_at' => $latest->firstWhere('type', $type)?->created_at?->toIso8601String(),
        ])->values());
    }

    /** Consent changes are appended (history kept), never overwritten. */
    public function updateConsent(UpdateConsentRequest $request, string $type): JsonResponse
    {
        abort_unless(in_array($type, ['marketing', 'medical_data_processing'], true), 404);
        $data = $request->validated();

        Consent::create([
            'user_id' => $request->user()->id, 'type' => $type, 'granted' => $data['granted'],
            'granted_at' => $data['granted'] ? now() : null, 'revoked_at' => $data['granted'] ? null : now(),
            'ip_address' => $request->ip(),
        ]);

        return $this->consents($request);
    }

    private function patient(Request $request): PatientProfile
    {
        return PatientProfile::forUser($request->user());
    }

    private function row(PatientProfile $p): array
    {
        return [
            'id' => $p->id,
            'date_of_birth' => $p->date_of_birth?->toDateString(),
            'gender' => $p->gender,
            'governorate_id' => $p->governorate_id,
            'city_id' => $p->city_id,
        ];
    }
}
