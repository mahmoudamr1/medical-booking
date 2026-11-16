<?php

namespace App\Events;

use App\Models\UrgentRequest;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Real-time status push (when a broadcaster such as Reverb is configured). Carries status only —
 * no personal data. Clients always re-fetch the authorized resource; polling is the fallback.
 */
class UrgentRequestUpdated implements ShouldBroadcast, ShouldDispatchAfterCommit
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public readonly UrgentRequest $request) {}

    /** @return list<PrivateChannel> */
    public function broadcastOn(): array
    {
        return [new PrivateChannel('urgent-request.'.$this->request->id)];
    }

    public function broadcastAs(): string
    {
        return 'urgent.updated';
    }

    public function broadcastWith(): array
    {
        return ['id' => $this->request->id, 'status' => $this->request->status->value, 'tier' => $this->request->current_tier];
    }
}
