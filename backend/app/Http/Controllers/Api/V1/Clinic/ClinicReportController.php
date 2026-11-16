<?php

namespace App\Http\Controllers\Api\V1\Clinic;

use App\Enums\AffiliationStatus;
use App\Enums\MembershipStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Shared\DateRangeRequest;
use App\Models\Clinic;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

/** Organization reports computed from real appointment records (aggregate SQL, no N+1). */
class ClinicReportController extends Controller
{
    public function __invoke(DateRangeRequest $request, Clinic $clinic): JsonResponse
    {
        [$from, $to] = $request->range();

        $base = fn () => DB::table('appointments')->where('appointments.clinic_id', $clinic->id)->whereBetween('appointments.starts_at', [$from, $to]);

        $totals = $base()->selectRaw("
            count(*) as total,
            count(*) filter (where status = 'confirmed') as confirmed,
            count(*) filter (where status = 'pending_confirmation') as pending,
            count(*) filter (where status = 'completed') as completed,
            count(*) filter (where status like 'cancelled_by_%') as cancelled,
            count(*) filter (where status = 'no_show') as no_show,
            coalesce(sum(price) filter (where status = 'completed'), 0) as completed_revenue
        ")->first();

        $byDoctor = $base()->join('doctor_profiles', 'doctor_profiles.id', '=', 'appointments.doctor_profile_id')
            ->join('users', 'users.id', '=', 'doctor_profiles.user_id')
            ->groupBy('doctor_profiles.id', 'users.name')
            ->selectRaw("doctor_profiles.id as doctor_id, users.name, count(*) as total,
                count(*) filter (where appointments.status = 'completed') as completed,
                count(*) filter (where appointments.status like 'cancelled_by_%') as cancelled")
            ->orderByDesc('total')->get();

        $byBranch = $base()->join('clinic_branches', 'clinic_branches.id', '=', 'appointments.clinic_branch_id')
            ->groupBy('clinic_branches.id', 'clinic_branches.name_ar', 'clinic_branches.name_en')
            ->selectRaw('clinic_branches.id as branch_id, clinic_branches.name_ar, clinic_branches.name_en, count(*) as total')
            ->orderByDesc('total')->get();

        $byDay = $base()->selectRaw("date(starts_at at time zone 'Africa/Cairo') as day, count(*) as total")
            ->groupBy('day')->orderBy('day')->get();

        return ApiResponse::ok([
            'range' => ['from' => $from->toIso8601String(), 'to' => $to->toIso8601String()],
            'totals' => array_map(fn ($v) => is_numeric($v) ? (float) $v : $v, (array) $totals),
            'by_doctor' => $byDoctor,
            'by_branch' => $byBranch,
            'by_day' => $byDay,
            'organization' => [
                'branches' => $clinic->branches()->where('is_active', true)->count(),
                'doctors' => $clinic->affiliations()->where('status', AffiliationStatus::Active->value)->distinct('doctor_profile_id')->count('doctor_profile_id'),
                'staff' => $clinic->memberships()->where('status', MembershipStatus::Active->value)->count(),
            ],
        ]);
    }
}
