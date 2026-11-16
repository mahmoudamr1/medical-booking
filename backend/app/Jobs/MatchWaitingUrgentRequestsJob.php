<?php

namespace App\Jobs;

use App\Services\Urgent\UrgentDispatcher;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;

/**
 * A doctor may have become available (opt-in, new availability window, freed capacity): waiting
 * urgent requests get a new matching round. Idempotent: UrgentDispatcher re-checks state under lock.
 */
class MatchWaitingUrgentRequestsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable;

    public int $tries = 3;

    public int $backoff = 5;

    public function handle(UrgentDispatcher $dispatcher): void
    {
        $dispatcher->matchWaiting();
    }
}
