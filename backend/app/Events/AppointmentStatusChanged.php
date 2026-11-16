<?php

namespace App\Events;

use App\Enums\ActorRole;
use App\Enums\AppointmentStatus;
use App\Models\Appointment;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class AppointmentStatusChanged implements ShouldDispatchAfterCommit
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public readonly Appointment $appointment,
        public readonly AppointmentStatus $from,
        public readonly ActorRole $actorRole,
    ) {}
}
