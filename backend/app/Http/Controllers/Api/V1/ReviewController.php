<?php

namespace App\Http\Controllers\Api\V1;

use App\Actions\Reviews\ReviewActions;
use App\Http\Controllers\Controller;
use App\Http\Requests\Review\ListDoctorReviewsRequest;
use App\Http\Requests\Review\ReportReviewRequest;
use App\Http\Requests\Review\StoreReviewRequest;
use App\Models\Appointment;
use App\Models\DoctorProfile;
use App\Models\Review;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class ReviewController extends Controller
{
    public function __construct(private readonly ReviewActions $actions) {}

    /** Public: published reviews of a publicly visible doctor. Patient shown by first name only. */
    public function index(ListDoctorReviewsRequest $request, string $doctor): JsonResponse
    {
        $profile = DoctorProfile::publiclyVisible()->findOrFail($doctor);
        $page = Review::with('patientProfile.user:id,name')
            ->where('doctor_profile_id', $profile->id)->where('status', 'published')
            ->latest()->paginate($request->validated('per_page') ?? 10);
        $page->through(fn (Review $r) => self::publicRow($r));

        return ApiResponse::paginated($page);
    }

    public function store(StoreReviewRequest $request, Appointment $appointment): JsonResponse
    {
        $data = $request->validated();
        $review = $this->actions->create($appointment, $request->user(), $data['rating'], $data['comment'] ?? null);

        return ApiResponse::created(self::publicRow($review->load('patientProfile.user')), __('reviews.thanks'));
    }

    public function report(ReportReviewRequest $request, Review $review): JsonResponse
    {
        abort_if($review->status !== 'published', 404);
        $this->actions->report($review, $request->user(), $request->validated('reason'));

        return ApiResponse::created(null, __('reviews.reported'));
    }

    public static function publicRow(Review $r): array
    {
        // Privacy: first name + last initial only ("Ahmed S.").
        $parts = preg_split('/\s+/u', trim((string) $r->patientProfile?->user?->name), -1, PREG_SPLIT_NO_EMPTY) ?: [];
        $display = $parts ? $parts[0].(count($parts) > 1 ? ' '.mb_substr(end($parts), 0, 1).'.' : '') : null;

        return [
            'id' => $r->id,
            'rating' => $r->rating,
            'comment' => $r->comment,
            'patient_display_name' => $display,
            'created_at' => $r->created_at?->toIso8601String(),
        ];
    }
}
