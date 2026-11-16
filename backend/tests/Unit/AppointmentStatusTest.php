<?php

namespace Tests\Unit;

use App\Enums\AppointmentStatus as S;
use PHPUnit\Framework\TestCase;

class AppointmentStatusTest extends TestCase
{
    public function test_allowed_transitions(): void
    {
        $this->assertTrue(S::PendingConfirmation->canTransitionTo(S::Confirmed));
        $this->assertTrue(S::PendingConfirmation->canTransitionTo(S::Rejected));
        $this->assertTrue(S::PendingConfirmation->canTransitionTo(S::Expired));
        $this->assertTrue(S::Confirmed->canTransitionTo(S::Completed));
        $this->assertTrue(S::Confirmed->canTransitionTo(S::NoShow));
        $this->assertTrue(S::Confirmed->canTransitionTo(S::CancelledByDoctor));
    }

    public function test_forbidden_transitions(): void
    {
        $this->assertFalse(S::Completed->canTransitionTo(S::PendingConfirmation)); // completed can't become pending
        $this->assertFalse(S::CancelledByPatient->canTransitionTo(S::Completed));   // cancelled can't be completed
        $this->assertFalse(S::PendingConfirmation->canTransitionTo(S::Completed));  // must be confirmed first
        $this->assertFalse(S::Confirmed->canTransitionTo(S::Rejected));
        $this->assertFalse(S::Confirmed->canTransitionTo(S::PendingConfirmation));
        $this->assertFalse(S::Expired->canTransitionTo(S::Confirmed));
    }

    public function test_terminal_and_blocking_states(): void
    {
        foreach (S::cases() as $s) {
            $this->assertSame(! in_array($s, [S::PendingConfirmation, S::Confirmed], true), $s->isTerminal(), $s->value);
            $this->assertSame(in_array($s, [S::PendingConfirmation, S::Confirmed], true), $s->isBlocking(), $s->value);
        }
    }

    public function test_dashboard_groups(): void
    {
        $this->assertSame('upcoming', S::Confirmed->group());
        $this->assertSame('pending', S::PendingConfirmation->group());
        $this->assertSame('completed', S::Completed->group());
        $this->assertSame('cancelled', S::CancelledByClinic->group());
        $this->assertSame('cancelled', S::Rejected->group());
    }
}
