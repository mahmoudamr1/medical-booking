<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Actions\Reviews\ReviewActions;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ListReviewReportsRequest;
use App\Http\Requests\Admin\ListReviewsRequest;
use App\Http\Requests\Shared\ReasonRequest;
use App\Models\Review;
use App\Models\ReviewReport;
use App\Services\Audit\AuditLogger;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ModerationController extends Controller
{
    public function reviews(ListReviewsRequest $request): JsonResponse
    {
        $page = Review::with(['doctorProfile.user:id,name', 'patientProfile.user:id,name'])
            ->withCount(['reports as open_reports_count' => fn ($q) => $q->where('status', 'open')])
            ->when($request->validated('status'), fn ($q, $s) => $q->where('status', $s))
            ->when($request->boolean('reported'), fn ($q) => $q->whereHas('reports', fn ($r) => $r->where('status', 'open')))
            ->latest()->paginate(25);
        $page->through(fn (Review $r) => $this->row($r));

        return ApiResponse::paginated($page);
    }

    public function moderate(ReasonRequest $request, Review $review, string $action, ReviewActions $actions): JsonResponse
    {
        $actions->moderate($review, $action, $request->user(), $request->validated('reason'));

        return ApiResponse::ok($this->row($review->fresh(['doctorProfile.user', 'patientProfile.user'])));
    }

    public function reports(ListReviewReportsRequest $request): JsonResponse
    {
        $status = $request->validated('status') ?? 'open';
        $page = ReviewReport::with(['review', 'reporter:id,name'])->where('status', $status)->latest()->paginate(25);
        $page->through(fn (ReviewReport $r) => [
            'id' => $r->id, 'reason' => $r->reason, 'status' => $r->status,
            'reporter' => $r->reporter?->only(['id', 'name']),
            'review' => ['id' => $r->review->id, 'rating' => $r->review->rating, 'comment' => $r->review->comment, 'status' => $r->review->status],
            'created_at' => $r->created_at?->toIso8601String(),
        ]);

        return ApiResponse::paginated($page);
    }

    public function resolveReport(Request $request, ReviewReport $report, string $decision, AuditLogger $audit): JsonResponse
    {
        $report->forceFill([
            'status' => $decision === 'resolve' ? 'resolved' : 'dismissed',
            'resolved_by' => $request->user()->id, 'resolved_at' => now(),
        ])->save();
        $audit->log("review_report.{$decision}", $report);

        return ApiResponse::ok(['id' => $report->id, 'status' => $report->status]);
    }

    private function row(Review $r): array
    {
        return [
            'id' => $r->id, 'rating' => $r->rating, 'comment' => $r->comment, 'status' => $r->status,
            'doctor' => ['id' => $r->doctor_profile_id, 'name' => $r->doctorProfile?->user?->name],
            'patient' => ['name' => $r->patientProfile?->user?->name],
            'open_reports_count' => $r->open_reports_count ?? null,
            'moderation_reason' => $r->moderation_reason,
            'moderated_at' => $r->moderated_at?->toIso8601String(),
            'created_at' => $r->created_at?->toIso8601String(),
        ];
    }
}
