<?php

namespace App\Enums;

/**
 * created → searching → notifying → accepted → in_progress → completed
 * searching|notifying ⇄ waiting (nobody available/accepted yet; kept open until keep_open_until)
 * searching|notifying|waiting → unmatched | cancelled | expired
 * accepted|in_progress → cancelled
 */
enum UrgentStatus: string
{
    use HasValues;

    case Created = 'created';
    case Searching = 'searching';
    case Notifying = 'notifying';
    case Waiting = 'waiting';
    case Accepted = 'accepted';
    case InProgress = 'in_progress';
    case Completed = 'completed';
    case Cancelled = 'cancelled';
    case Unmatched = 'unmatched';
    case Expired = 'expired';

    /** Still looking for a volunteer: the only states in which a doctor may accept. */
    public const MATCHING = ['searching', 'notifying', 'waiting'];

    /** States in which the patient has an "open" request (limits one open request per patient). */
    public const OPEN = ['created', 'searching', 'notifying', 'waiting', 'accepted', 'in_progress'];

    /** States in which the accepted doctor is busy with this request (workload). */
    public const ACTIVE_WITH_DOCTOR = ['accepted', 'in_progress'];

    public function isMatching(): bool
    {
        return in_array($this->value, self::MATCHING, true);
    }

    public function isClosed(): bool
    {
        return ! in_array($this->value, self::OPEN, true);
    }
}
