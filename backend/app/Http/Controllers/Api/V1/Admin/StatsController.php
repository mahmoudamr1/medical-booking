<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AppointmentStatsRequest;
use App\Http\Requests\Shared\DateRangeRequest;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

/** Platform analytics: every number is an aggregate query over real records (no hardcoding, no N+1). */
class StatsController extends Controller
{
    public function overview(DateRangeRequest $request): JsonResponse
    {
        [$from, $to] = $request->range();

        $people = DB::selectOne("
            select
              (select count(distinct ur.user_id) from user_roles ur join roles r on r.id = ur.role_id where r.name = 'patient') as total_patients,
              (select count(*) from doctor_profiles) as total_doctors,
              (select count(*) from doctor_profiles where verification_status = 'approved' and is_active) as verified_doctors,
              (select count(*) from doctor_profiles where verification_status = 'pending') as pending_verifications,
              (select count(*) from clinics where not is_personal_practice) as total_clinics,
              (select count(*) from volunteer_profiles where status = 'active') as active_volunteers
        ");

        $appointments = DB::table('appointments')->whereBetween('starts_at', [$from, $to])->selectRaw("
            count(*) as total,
            count(*) filter (where status = 'confirmed' and starts_at >= now()) as upcoming,
            count(*) filter (where status = 'pending_confirmation') as pending,
            count(*) filter (where status = 'completed') as completed,
            count(*) filter (where status like 'cancelled_by_%') as cancelled,
            count(*) filter (where status = 'no_show') as no_show
        ")->first();

        $urgent = DB::table('urgent_requests')->selectRaw("
            count(*) filter (where status in ('searching','notifying','accepted','in_progress')) as open,
            count(*) filter (where status = 'unmatched' and created_at between ? and ?) as unmatched,
            count(*) filter (where status = 'completed' and created_at between ? and ?) as completed,
            count(*) filter (where flagged_at is not null and created_at between ? and ?) as flagged
        ", [$from, $to, $from, $to, $from, $to])->first();

        return ApiResponse::ok([
            'range' => ['from' => $from->toIso8601String(), 'to' => $to->toIso8601String()],
            'people' => array_map('intval', (array) $people),
            'appointments' => array_map('intval', (array) $appointments),
            'urgent' => array_map('intval', (array) $urgent),
            'reviews' => [
                'open_reports' => DB::table('review_reports')->where('status', 'open')->count(),
                'hidden' => DB::table('reviews')->where('status', 'hidden')->count(),
            ],
        ]);
    }

    /** Appointment counts grouped by day | specialty | clinic, within a date range. */
    public function appointments(AppointmentStatsRequest $request): JsonResponse
    {
        [$from, $to] = $request->range();
        $groupBy = $request->validated('group_by') ?? 'day';
        $base = DB::table('appointments as a')->whereBetween('a.starts_at', [$from, $to]);

        $rows = match ($groupBy) {
            'specialty' => $base->join('doctor_specialties as ds', fn ($j) => $j->on('ds.doctor_profile_id', '=', 'a.doctor_profile_id')->where('ds.is_primary', true))
                ->join('specialties as s', 's.id', '=', 'ds.specialty_id')
                ->selectRaw('s.slug as key, s.name_ar as label_ar, s.name_en as label_en')->groupBy('s.slug', 's.name_ar', 's.name_en'),
            'clinic' => $base->leftJoin('clinics as c', 'c.id', '=', 'a.clinic_id')
                ->selectRaw("coalesce(c.slug, 'online') as key, c.name_ar as label_ar, c.name_en as label_en")->groupBy('c.slug', 'c.name_ar', 'c.name_en'),
            default => $base->selectRaw("date(a.starts_at at time zone 'Africa/Cairo') as key, null as label_ar, null as label_en")
                ->groupBy('key')->orderBy('key'), // 'day'
        };
        $rows = $rows->selectRaw("count(*) as total,
            count(*) filter (where a.status = 'completed') as completed,
            count(*) filter (where a.status like 'cancelled_by_%') as cancelled,
            coalesce(sum(a.price) filter (where a.status = 'completed'), 0) as completed_value")->get();

        return ApiResponse::ok(['group_by' => $groupBy, 'rows' => $rows]);
    }
}
