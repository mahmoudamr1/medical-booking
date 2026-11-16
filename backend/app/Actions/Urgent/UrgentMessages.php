<?php

namespace App\Actions\Urgent;

use App\Events\UrgentRequestUpdated;
use App\Exceptions\BusinessRuleException;
use App\Models\DoctorProfile;
use App\Models\UrgentRequest;
use App\Models\UrgentRequestMessage;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;

/**
 * The patient ↔ accepted-doctor message thread of an urgent request.
 * - Participants only: the patient owner or the accepted doctor; anyone else gets 404 (no disclosure).
 * - Only after acceptance (409 not_accepted); sending stops once the request is closed (409 closed),
 *   the history stays readable.
 * - Reading advances the viewer's read marker (drives `unread_messages`); a doctor's read that
 *   returns messages is audit-logged (empty polls disclose nothing and are not logged).
 */
final class UrgentMessages
{
    public const PAGE_SIZE = 200;

    public function __construct(private readonly AuditLogger $audit) {}

    /** @return Collection<int, UrgentRequestMessage> messages after $afterId, oldest first */
    public function list(UrgentRequest $request, User $viewer, ?int $afterId): Collection
    {
        $side = $this->participantSide($request, $viewer);
        $this->ensureAccepted($request);

        $messages = $request->messages()
            ->when($afterId !== null, fn ($q) => $q->where('id', '>', $afterId))
            ->orderBy('id')->limit(self::PAGE_SIZE)->get();

        $last = $messages->last();
        if ($last !== null) {
            $marker = UrgentRequest::READ_MARKER[$side];
            UrgentRequest::whereKey($request->id)
                ->update([$marker => DB::raw("greatest(coalesce({$marker}, 0), {$last->id})")]);
            if ($side === 'doctor') {
                $this->audit->log('urgent.messages.viewed', $request, ['count' => $messages->count(), 'after_id' => $afterId]);
            }
        }

        return $messages->each(fn (UrgentRequestMessage $m) => $m->setRelation('urgentRequest', $request));
    }

    public function send(UrgentRequest $request, User $sender, string $body): UrgentRequestMessage
    {
        $this->participantSide($request, $sender);

        $message = DB::transaction(function () use ($request, $sender, $body) {
            // Re-read under lock so a message can't slip in after a concurrent cancel/complete.
            $current = UrgentRequest::whereKey($request->id)->lockForUpdate()->firstOrFail();
            $this->ensureAccepted($current);
            if ($current->status->isClosed()) {
                throw BusinessRuleException::conflict('closed', __('urgent.messages_closed'));
            }

            return $request->messages()->create(['sender_user_id' => $sender->id, 'body' => trim($body)]);
        });
        UrgentRequestUpdated::dispatch($request); // status-only push; clients re-fetch the thread

        return $message->setRelation('urgentRequest', $request);
    }

    /** @return 'patient'|'doctor' */
    private function participantSide(UrgentRequest $request, User $user): string
    {
        $request->loadMissing('patientProfile');
        if ($request->patientProfile->user_id === $user->id) {
            return 'patient';
        }
        if ($request->accepted_doctor_profile_id !== null
            && DoctorProfile::whereKey($request->accepted_doctor_profile_id)->where('user_id', $user->id)->exists()) {
            return 'doctor';
        }

        throw (new ModelNotFoundException)->setModel(UrgentRequest::class, [$request->id]);
    }

    private function ensureAccepted(UrgentRequest $request): void
    {
        if ($request->accepted_doctor_profile_id === null) {
            throw BusinessRuleException::conflict('not_accepted', __('urgent.messages_not_accepted'));
        }
    }
}
