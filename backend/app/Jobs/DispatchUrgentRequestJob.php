<?php

namespace App\Jobs;

use App\Services\Urgent\UrgentDispatcher;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;

/** Idempotent: UrgentDispatcher re-checks state under lock. */
class DispatchUrgentRequestJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable;

    public int $tries = 3;

    public int $backoff = 5;

    public function __construct(public readonly string $urgentRequestId, public readonly int $tier) {}

    public function handle(UrgentDispatcher $dispatcher): void
    {
        $dispatcher->runTier($this->urgentRequestId, $this->tier);
    }
}
