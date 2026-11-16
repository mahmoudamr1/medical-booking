<?php

namespace App\Services\Urgent;

use App\Enums\UrgentSeverity;
use App\Enums\UrgentStatus;
use App\Events\UrgentRequestUpdated;
use App\Jobs\DispatchUrgentRequestJob;
use App\Jobs\FinalizeUrgentRequestJob;
use App\Models\DoctorProfile;
use App\Models\UrgentRequest;
use App\Models\UrgentRequestDispatch;
use App\Notifications\UrgentNotification;
use App\Services\Settings;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Idempotent matching. Each step re-reads the request under a row lock and does nothing unless it
 * is still matching (searching/notifying/waiting) and the step has not run yet, so retried, late or
 * superseded jobs are harmless.
 *
 *   start():        tier 0 (directed to the preferred doctor) when one was picked, else tier 1.
 *   runTier(t):     notify eligible doctors of step t (skipping empty steps immediately), then schedule
 *                   step t+1 after step t's timeout, or finalize after the last step's timeout.
 *                   critical: a single wave (tier 1) to everyone eligible, then finalize.
 *   broadcast():    the directed doctor declined or became unavailable → fall back right away.
 *   finalize():     still unaccepted → waiting until keep_open_until, then unmatched (the patient is
 *                   told honestly no doctor accepted).
 *   matchWaiting(): a doctor may have become available → waiting requests get a new round (runTier 1).
 * Timeouts are operational settings, not response guarantees.
 */
final class UrgentDispatcher
{
    public function __construct(
        private readonly VolunteerMatcher $matcher,
        private readonly Settings $settings,
    ) {}

    public function start(UrgentRequest $request): void
    {
        $this->runTier($request->id, $request->preferred_doctor_profile_id !== null ? 0 : 1);
    }

    /** Fallback from the directed step to the broadcast (critical wave or tier 1). */
    public function broadcast(string $requestId): void
    {
        $this->runTier($requestId, 1);
    }

    /** The doctor ended their availability: requests directed to them fall back to broadcast now. */
    public function releaseDirected(string $doctorProfileId): void
    {
        $directed = UrgentRequestDispatch::where('doctor_profile_id', $doctorProfileId)
            ->where('tier', 0)->where('status', 'notified')
            ->whereHas('urgentRequest', fn ($q) => $q->whereIn('status', UrgentStatus::MATCHING));
        $requestIds = $directed->pluck('urgent_request_id');
        $directed->update(['status' => 'expired', 'responded_at' => now()]);

        $requestIds->each(fn (string $id) => $this->broadcast($id));
    }

    /**
     * A doctor may have become available (opt-in, new window, freed capacity, scheduled window start):
     * every waiting request, critical first then oldest, gets a new matching round with the usual
     * steps and eligibility. Requests nobody can take yet stay waiting quietly.
     */
    public function matchWaiting(): void
    {
        if (! $this->matcher->availableNow()->exists()) {
            return;
        }
        UrgentRequest::where('status', UrgentStatus::Waiting->value)->where('keep_open_until', '>', now())
            ->orderByRaw(UrgentSeverity::rankSql('urgent_requests.severity'))->oldest()
            ->pluck('id')
            ->each(fn (string $id) => $this->runTier($id, 1));
    }

    /** How long a request can stay in matching under current settings (basis of its expires_at). */
    public function matchingWindowSeconds(UrgentRequest $request): int
    {
        $first = $request->preferred_doctor_profile_id !== null ? 0 : 1;

        return array_sum(array_map(fn (int $t) => $this->timeoutAfter($request, $t),
            range($first, VolunteerMatcher::lastTier($request))));
    }

    public function runTier(string $requestId, int $tier): void
    {
        /** @var array{int, Collection<int, DoctorProfile>, UrgentRequest, string|null}|null $outcome */
        $outcome = DB::transaction(function () use ($requestId, $tier) {
            $request = UrgentRequest::with('patientProfile')->lockForUpdate()->find($requestId);
            if (! $request || ! $request->status->isMatching()) {
                return null;
            }
            // Each step runs once (e.g. the directed timeout firing after a decline already fell back).
            if ($request->status === UrgentStatus::Notifying && $tier <= $request->current_tier) {
                return null;
            }
            $wasWaiting = $request->status === UrgentStatus::Waiting;
            if ($wasWaiting && ! $request->canKeepOpen()) {
                return null; // past its deadline: only finalize() may touch it now
            }

            $last = VolunteerMatcher::lastTier($request);
            for ($t = $tier; $t <= $last; $t++) {
                $doctors = $this->matcher->eligible($request, $t);
                if ($doctors->isNotEmpty()) {
                    foreach ($doctors as $doctor) {
                        UrgentRequestDispatch::create([
                            'urgent_request_id' => $request->id, 'doctor_profile_id' => $doctor->id,
                            'tier' => $t, 'status' => 'notified', 'notified_at' => now(),
                        ]);
                    }
                    $request->status = UrgentStatus::Notifying;
                    $request->current_tier = $t;
                    $request->gp_disclosure = $request->gp_disclosure || $this->widensSpecialty($request, $t);
                    $request->save();

                    return [$t, $doctors, $request, $wasWaiting ? 'redispatched' : null];
                }
            }

            if ($wasWaiting) {
                return null; // still nobody: keep waiting quietly
            }
            // Nobody eligible in any remaining step and no doctor still holds a notification.
            if (! $request->dispatches()->where('status', 'notified')->exists()) {
                return [$last, collect(), $request, $this->waitOrClose($request)];
            }
            $request->current_tier = $last;
            $request->save();

            return [$last, collect(), $request, null];
        });

        if ($outcome === null) {
            return;
        }
        [$t, $doctors, $request, $patientEvent] = $outcome;

        foreach ($doctors as $doctor) {
            $doctor->user->notify(new UrgentNotification($request, 'new_request'));
        }
        $this->announce($request, $patientEvent);
        if (in_array($patientEvent, ['waiting', 'unmatched'], true)) {
            return;
        }

        $delay = now()->addSeconds($this->timeoutAfter($request, $t));
        if ($t < VolunteerMatcher::lastTier($request)) {
            DispatchUrgentRequestJob::dispatch($request->id, $t + 1)->delay($delay);
        } else {
            FinalizeUrgentRequestJob::dispatch($request->id)->delay($delay);
        }
    }

    /** Nobody accepted in time: keep waiting until the deadline, or close as unmatched once it passed. */
    public function finalize(string $requestId): void
    {
        /** @var array{UrgentRequest, string}|null $outcome */
        $outcome = DB::transaction(function () use ($requestId) {
            $request = UrgentRequest::with('patientProfile.user')->lockForUpdate()->find($requestId);
            if (! $request || ! $request->status->isMatching()) {
                return null;
            }
            if ($request->status === UrgentStatus::Waiting && $request->canKeepOpen()) {
                return null; // early or stale job: the deadline has not passed yet
            }

            return [$request, $this->waitOrClose($request)];
        });

        if ($outcome !== null) {
            $this->announce(...$outcome);
        }
    }

    /** Seconds to wait for an acceptance after step $tier before moving on. */
    private function timeoutAfter(UrgentRequest $request, int $tier): int
    {
        return $this->settings->int(match (true) {
            $tier === 0 => 'urgent_directed_timeout_seconds',
            $request->severity === UrgentSeverity::Critical => 'urgent_critical_timeout_seconds',
            default => "urgent_tier{$tier}_timeout_seconds",
        });
    }

    /** The step may reach doctors outside the requested specialty (disclosed to the patient). */
    private function widensSpecialty(UrgentRequest $request, int $tier): bool
    {
        return $request->severity === UrgentSeverity::Critical
            ? $tier >= 1 && $request->specialty_id !== null
            : $tier === 3;
    }

    /**
     * Nobody took the request: it waits for a doctor to become available while its keep-open deadline
     * is ahead (a job at the deadline and the sweeper close it), otherwise it is closed as unmatched.
     * Doctors already notified keep their notification and may still accept. Inside the request lock.
     *
     * @return 'waiting'|'unmatched'
     */
    private function waitOrClose(UrgentRequest $request): string
    {
        if (! $request->canKeepOpen()) {
            $this->closeUnmatched($request);

            return 'unmatched';
        }
        $request->status = UrgentStatus::Waiting;
        $request->expires_at = $request->keep_open_until;
        $request->save();

        return 'waiting';
    }

    /** After commit: tell the patient what changed (if anything) and push the live update. */
    private function announce(UrgentRequest $request, ?string $patientEvent): void
    {
        if ($patientEvent !== null) {
            $request->patientProfile->user->notify(new UrgentNotification($request, $patientEvent));
        }
        if ($patientEvent === 'waiting' && $request->keep_open_until !== null) {
            FinalizeUrgentRequestJob::dispatch($request->id)->delay($request->keep_open_until);
        }
        UrgentRequestUpdated::dispatch($request);
    }

    /** Must be called inside a transaction holding the request lock. */
    private function closeUnmatched(UrgentRequest $request): void
    {
        $request->status = UrgentStatus::Unmatched;
        $request->closed_at = now()->toImmutable();
        $request->close_reason = 'no_volunteer_accepted';
        $request->location_details = null; // data minimization: no longer needed
        $request->save();
        $request->dispatches()->where('status', 'notified')->update(['status' => 'expired', 'responded_at' => now()]);
    }
}
