<?php

namespace App\Actions\Reviews;

use App\Enums\AppointmentStatus;
use App\Exceptions\BusinessRuleException;
use App\Models\Appointment;
use App\Models\DoctorProfile;
use App\Models\Review;
use App\Models\ReviewReport;
use App\Models\User;
use App\Notifications\AdminAlert;
use App\Services\Audit\AuditLogger;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;

final class ReviewActions
{
    public function __construct(private readonly AuditLogger $audit) {}

    /** Only the patient of a COMPLETED appointment, once (DB unique on appointment_id is the backstop). */
    public function create(Appointment $appointment, User $patientUser, int $rating, ?string $comment): Review
    {
        $appointment->loadMissing('patientProfile');
        if ($appointment->patientProfile->user_id !== $patientUser->id) {
            throw new AuthorizationException;
        }
        if ($appointment->status !== AppointmentStatus::Completed) {
            throw BusinessRuleException::unprocessable('not_eligible', __('reviews.not_eligible'));
        }

        try {
            $review = DB::transaction(function () use ($appointment, $rating, $comment) {
                $review = Review::create([
                    'appointment_id' => $appointment->id,
                    'doctor_profile_id' => $appointment->doctor_profile_id,
                    'patient_profile_id' => $appointment->patient_profile_id,
                    'rating' => $rating,
                    'comment' => $comment,
                ]);
                $this->recalculate($appointment->doctor_profile_id);

                return $review;
            });
        } catch (UniqueConstraintViolationException) {
            throw BusinessRuleException::conflict('already_reviewed', __('reviews.already_reviewed'));
        }

        return $review;
    }

    public function report(Review $review, User $reporter, string $reason): ReviewReport
    {
        try {
            // Own transaction (= savepoint when nested) so a duplicate never aborts an outer transaction.
            $report = DB::transaction(fn () => ReviewReport::create(['review_id' => $review->id, 'reporter_user_id' => $reporter->id, 'reason' => $reason]));
        } catch (UniqueConstraintViolationException) {
            throw BusinessRuleException::conflict('already_reported', __('reviews.already_reported'));
        }
        Notification::send(User::whereHas('roles', fn ($q) => $q->where('name', 'admin'))->get(),
            new AdminAlert('review_reported', ['review_id' => $review->id]));

        return $report;
    }

    /** hide | restore — hidden reviews are excluded from public lists and the rating average. */
    public function moderate(Review $review, string $action, User $admin, ?string $reason): Review
    {
        DB::transaction(function () use ($review, $action, $admin, $reason) {
            $review->forceFill([
                'status' => $action === 'hide' ? 'hidden' : 'published',
                'moderated_by' => $admin->id, 'moderated_at' => now(), 'moderation_reason' => $reason,
            ])->save();
            $this->recalculate($review->doctor_profile_id);
            $this->audit->log("review.{$action}", $review, ['reason' => $reason], $admin->id);
        });

        return $review;
    }

    /** Aggregate from source data (never incremental drift). */
    public function recalculate(string $doctorProfileId): void
    {
        $published = Review::where('doctor_profile_id', $doctorProfileId)->where('status', 'published');
        DoctorProfile::whereKey($doctorProfileId)->update([
            'rating_avg' => round((float) $published->clone()->avg('rating'), 2),
            'rating_count' => $published->count(),
        ]);
    }
}
