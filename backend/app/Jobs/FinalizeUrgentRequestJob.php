<?php

namespace App\Jobs;

use App\Services\Urgent\UrgentDispatcher;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;

/** Final availability check: unaccepted requests become "unmatched". Idempotent. */
class FinalizeUrgentRequestJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable;

    public int $tries = 3;

    public int $backoff = 5;

    public function __construct(public readonly string $urgentRequestId) {}

    public function handle(UrgentDispatcher $dispatcher): void
    {
        $dispatcher->finalize($this->urgentRequestId);
    }
}
