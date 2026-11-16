<?php

namespace App\Actions\Urgent;

use App\Enums\UrgentStatus;
use App\Events\UrgentRequestUpdated;
use App\Exceptions\BusinessRuleException;
use App\Jobs\MatchWaitingUrgentRequestsJob;
use App\Models\DoctorProfile;
use App\Models\UrgentRequest;
use App\Models\UrgentRequestDispatch;
use App\Models\User;
use App\Notifications\AdminAlert;
use App\Notifications\UrgentNotification;
use App\Services\Audit\AuditLogger;
use App\Services\Urgent\UrgentDispatcher;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;

final class UrgentRequestActions
{
    public function __construct(
        private readonly AuditLogger $audit,
        private readonly UrgentDispatcher $dispatcher,
    ) {}

    /**
     * First eligible acceptance wins, atomically.
     *
     * A single conditional UPDATE flips the request from searching/notifying to accepted; only one
     * transaction can see a matching row. The partial unique index on accepted dispatches is the
     * database-level backstop. Losers get 409 urgent_already_accepted.
     */
    public function accept(UrgentRequest $request, DoctorProfile $doctor): UrgentRequest
    {
        $dispatch = $this->dispatchFor($request, $doctor);
        if (! in_array($dispatch->status, ['notified'], true)) {
            throw BusinessRuleException::conflict('urgent_not_available', __('urgent.no_longer_available'));
        }

        try {
            $won = DB::transaction(function () use ($request, $doctor, $dispatch) {
                // Workload re-check at acceptance time; locking the volunteer's own profile row
                // serializes this doctor's concurrent acceptances of different requests.
                $volunteer = $doctor->volunteerProfile()->lockForUpdate()->first();
                if (! $volunteer || $volunteer->status !== 'active') {
                    throw BusinessRuleException::conflict('not_volunteer', __('urgent.not_volunteer'));
                }
                $active = UrgentRequest::where('accepted_doctor_profile_id', $doctor->id)
                    ->whereIn('status', UrgentStatus::ACTIVE_WITH_DOCTOR)->count();
                if ($active >= $volunteer->max_concurrent_requests) {
                    throw BusinessRuleException::conflict('workload_limit', __('urgent.workload_limit'));
                }

                $updated = UrgentRequest::whereKey($request->id)
                    ->whereIn('status', UrgentStatus::MATCHING)
                    ->update([
                        'status' => UrgentStatus::Accepted->value,
                        'accepted_doctor_profile_id' => $doctor->id,
                        'accepted_at' => now(),
                        'updated_at' => now(),
                    ]);
                if ($updated === 0) {
                    return false;
                }

                UrgentRequestDispatch::whereKey($dispatch->id)->update(['status' => 'accepted', 'responded_at' => now()]);
                UrgentRequestDispatch::where('urgent_request_id', $request->id)->where('status', 'notified')
                    ->update(['status' => 'lost', 'responded_at' => now()]);

                return true;
            });
        } catch (QueryException $e) {
            if ($e->getCode() !== '23505') { // unique violation on the single-winner index
                throw $e;
            }
            $won = false;
        }

        if (! $won) {
            UrgentRequestDispatch::whereKey($dispatch->id)->where('status', 'notified')->update(['status' => 'lost', 'responded_at' => now()]);
            throw BusinessRuleException::conflict('urgent_already_accepted', __('urgent.already_accepted'));
        }

        $fresh = UrgentRequest::with(['patientProfile.user', 'acceptedDoctor.user'])->findOrFail($request->id);
        $this->audit->log('urgent.request.accepted', $fresh, ['doctor_profile_id' => $doctor->id], $doctor->user_id);
        $fresh->patientProfile->user->notify(new UrgentNotification($fresh, 'accepted'));
        UrgentRequestDispatch::with('doctorProfile.user')->where('urgent_request_id', $fresh->id)->where('status', 'lost')->get()
            ->each(fn (UrgentRequestDispatch $d) => $d->doctorProfile->user->notify(new UrgentNotification($fresh, 'taken')));
        UrgentRequestUpdated::dispatch($fresh);

        return $fresh;
    }

    /** A declining directed (tier 0) doctor sends the request to the broadcast immediately. */
    public function decline(UrgentRequest $request, DoctorProfile $doctor): void
    {
        $dispatch = $this->dispatchFor($request, $doctor);
        $declined = UrgentRequestDispatch::whereKey($dispatch->id)->where('status', 'notified')
            ->update(['status' => 'declined', 'responded_at' => now()]);
        if ($declined > 0 && $dispatch->tier === 0) {
            $this->dispatcher->broadcast($request->id);
        }
    }

    /**
     * accepted → in_progress → completed, by the accepted doctor only. Completing may record a
     * short outcome note (visible to the patient, the doctor and admins).
     *
     * @param  'start'|'complete'  $action
     */
    public function progress(UrgentRequest $request, DoctorProfile $doctor, string $action, ?string $outcomeNote = null): UrgentRequest
    {
        [$from, $to] = match ($action) {
            'start' => [UrgentStatus::Accepted, UrgentStatus::InProgress],
            'complete' => [UrgentStatus::InProgress, UrgentStatus::Completed],
        };
        if ($request->accepted_doctor_profile_id !== $doctor->id) {
            throw new AuthorizationException;
        }

        $changes = ['status' => $to->value, 'updated_at' => now()];
        if ($to === UrgentStatus::InProgress) {
            $changes['started_at'] = now();
        } else {
            $changes += ['closed_at' => now(), 'close_reason' => 'completed', 'location_details' => null, 'outcome_note' => $outcomeNote];
        }
        if (UrgentRequest::whereKey($request->id)->where('status', $from->value)->update($changes) === 0) {
            throw BusinessRuleException::conflict('invalid_transition', __('urgent.invalid_transition'));
        }
        $fresh = $request->fresh();
        UrgentRequestUpdated::dispatch($fresh);
        if ($to === UrgentStatus::Completed) {
            MatchWaitingUrgentRequestsJob::dispatch(); // the doctor has capacity again
        }

        return $fresh;
    }

    /** Patient may cancel while matching (incl. waiting) or before the consultation completes. */
    public function cancel(UrgentRequest $request, User $patientUser, ?string $reason): UrgentRequest
    {
        $request->loadMissing('patientProfile');
        if ($request->patientProfile->user_id !== $patientUser->id) {
            throw new AuthorizationException;
        }

        $updated = UrgentRequest::whereKey($request->id)
            ->whereIn('status', UrgentStatus::OPEN)
            ->update(['status' => UrgentStatus::Cancelled->value, 'closed_at' => now(), 'updated_at' => now(),
                'close_reason' => mb_substr('patient_cancelled'.($reason ? ': '.$reason : ''), 0, 255), 'location_details' => null]);
        if ($updated === 0) {
            throw BusinessRuleException::conflict('invalid_transition', __('urgent.invalid_transition'));
        }
        UrgentRequestDispatch::where('urgent_request_id', $request->id)->where('status', 'notified')
            ->update(['status' => 'expired', 'responded_at' => now()]);

        $fresh = $request->fresh(['acceptedDoctor.user']);
        $fresh->acceptedDoctor?->user->notify(new UrgentNotification($fresh, 'cancelled'));
        UrgentRequestUpdated::dispatch($fresh);
        if ($fresh->acceptedDoctor !== null) {
            MatchWaitingUrgentRequestsJob::dispatch(); // the doctor has capacity again
        }

        return $fresh;
    }

    /** A dispatched doctor reports abusive / prank use; surfaced to admins. */
    public function flag(UrgentRequest $request, DoctorProfile $doctor, string $reason): void
    {
        $this->dispatchFor($request, $doctor);
        $request->forceFill(['flagged_at' => now(), 'flagged_by' => $doctor->user_id, 'flag_reason' => $reason])->save();
        $this->audit->log('urgent.request.flagged', $request, ['reason' => $reason], $doctor->user_id);
        Notification::send(
            User::whereHas('roles', fn ($q) => $q->where('name', 'admin'))->get(),
            new AdminAlert('urgent_flagged', ['urgent_request_id' => $request->id]),
        );
    }

    /** Doctors can only act on requests they were actually dispatched (404 otherwise: no disclosure). */
    private function dispatchFor(UrgentRequest $request, DoctorProfile $doctor): UrgentRequestDispatch
    {
        return UrgentRequestDispatch::where('urgent_request_id', $request->id)
            ->where('doctor_profile_id', $doctor->id)->firstOrFail();
    }
}
