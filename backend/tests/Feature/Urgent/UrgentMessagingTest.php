<?php

namespace Tests\Feature\Urgent;

use App\Jobs\DispatchUrgentRequestJob;
use App\Jobs\FinalizeUrgentRequestJob;
use App\Models\DoctorProfile;
use App\Models\PatientProfile;
use App\Models\Specialty;
use App\Models\User;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Notification;
use Tests\Concerns\BuildsVolunteers;
use Tests\TestCase;

/** Spec 002: patient ↔ accepted doctor messages, outcome note, unread counts. */
class UrgentMessagingTest extends TestCase
{
    use BuildsVolunteers;

    private User $patient;

    private DoctorProfile $winner;

    private DoctorProfile $loser;

    private string $id;

    protected function setUp(): void
    {
        parent::setUp();
        $this->freezeTime();
        Notification::fake();
        Bus::fake([DispatchUrgentRequestJob::class, FinalizeUrgentRequestJob::class]);
        $this->geography();
        $specialty = Specialty::factory()->create();
        $this->winner = $this->volunteer($specialty, $this->nasrCity);
        $this->loser = $this->volunteer($specialty, $this->nasrCity);
        $this->patient = PatientProfile::factory()->create()->user;
        $this->id = $this->actingAsUser($this->patient)
            ->postJson('/api/v1/urgent-requests', $this->urgentPayload(['specialty_id' => $specialty->id]), $this->apiHeaders())
            ->assertCreated()->json('data.id');
    }

    private function url(string $suffix = ''): string
    {
        return "/api/v1/urgent-requests/{$this->id}/messages{$suffix}";
    }

    private function accept(): void
    {
        $this->actingAsUser($this->winner->user)->postJson("/api/v1/urgent-requests/{$this->id}/accept", [], $this->apiHeaders())->assertOk();
    }

    public function test_messages_are_only_available_after_acceptance(): void
    {
        $this->actingAsUser($this->patient)->getJson($this->url(), $this->apiHeaders())
            ->assertStatus(409)->assertJsonPath('code', 'not_accepted');
        $this->postJson($this->url(), ['body' => 'Hello?'], $this->apiHeaders())
            ->assertStatus(409)->assertJsonPath('code', 'not_accepted');
        // A dispatched doctor is not a participant before (or after) acceptance: no disclosure.
        $this->actingAsUser($this->winner->user)->getJson($this->url(), $this->apiHeaders())->assertNotFound();
    }

    public function test_patient_and_accepted_doctor_exchange_messages_incrementally(): void
    {
        $this->accept();

        $first = $this->actingAsUser($this->patient)->postJson($this->url(), ['body' => 'My child has 39.5 fever'], $this->apiHeaders())
            ->assertCreated()->assertJsonPath('data.sender', 'patient')->assertJsonPath('data.mine', true)->json('data.id');
        $this->getJson("/api/v1/urgent-requests/{$this->id}", $this->apiHeaders())->assertJsonPath('data.unread_messages', 0);

        $this->actingAsUser($this->winner->user)->getJson("/api/v1/urgent-requests/{$this->id}", $this->apiHeaders())
            ->assertJsonPath('data.unread_messages', 1);
        $this->getJson($this->url(), $this->apiHeaders())->assertOk()->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.sender', 'patient')->assertJsonPath('data.0.mine', false)
            ->assertJsonPath('data.0.body', 'My child has 39.5 fever');
        $this->assertDatabaseHas('audit_logs', ['action' => 'urgent.messages.viewed', 'actor_user_id' => $this->winner->user_id, 'subject_id' => $this->id]);
        $this->getJson('/api/v1/doctor/urgent-requests?status=accepted', $this->apiHeaders())->assertJsonPath('data.0.unread_messages', 0);

        $this->postJson($this->url(), ['body' => 'Give paracetamol and call me back'], $this->apiHeaders())
            ->assertCreated()->assertJsonPath('data.sender', 'doctor');

        $this->actingAsUser($this->patient)->getJson('/api/v1/patient/urgent-requests', $this->apiHeaders())
            ->assertJsonPath('data.0.unread_messages', 1);
        $this->getJson($this->url("?after_id={$first}"), $this->apiHeaders())->assertOk()->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.sender', 'doctor')->assertJsonPath('data.0.mine', false);
        $this->getJson($this->url(), $this->apiHeaders())->assertJsonCount(2, 'data');
        $this->getJson("/api/v1/urgent-requests/{$this->id}", $this->apiHeaders())->assertJsonPath('data.unread_messages', 0);

        $this->postJson($this->url(), ['body' => str_repeat('x', 1001)], $this->apiHeaders())->assertJsonValidationErrors(['body']);
        $this->postJson($this->url(), ['body' => '   '], $this->apiHeaders())->assertJsonValidationErrors(['body']);
    }

    public function test_non_participants_get_404_and_see_nothing(): void
    {
        $this->accept();
        $this->actingAsUser($this->patient)->postJson($this->url(), ['body' => 'Private details here'], $this->apiHeaders())->assertCreated();

        $outsiders = [$this->loser->user, PatientProfile::factory()->create()->user, User::factory()->admin()->create()];
        foreach ($outsiders as $user) {
            $res = $this->actingAsUser($user)->getJson($this->url(), $this->apiHeaders())->assertNotFound();
            $this->assertStringNotContainsString('Private details', $res->getContent());
            $this->postJson($this->url(), ['body' => 'intrusion'], $this->apiHeaders())->assertNotFound();
            $this->getJson("/api/v1/urgent-requests/{$this->id}", $this->apiHeaders())->assertJsonMissing(['unread_messages' => 1]);
        }
        $this->assertDatabaseMissing('urgent_request_messages', ['body' => 'intrusion']);
    }

    public function test_outcome_note_is_saved_on_completion_and_the_thread_closes(): void
    {
        $this->accept();
        $this->postJson("/api/v1/urgent-requests/{$this->id}/start", [], $this->apiHeaders())->assertOk();
        $this->postJson("/api/v1/urgent-requests/{$this->id}/complete", ['outcome_note' => str_repeat('n', 2001)], $this->apiHeaders())
            ->assertJsonValidationErrors(['outcome_note']);
        $this->postJson("/api/v1/urgent-requests/{$this->id}/complete", ['outcome_note' => 'Fever controlled; follow up with a pediatrician.'], $this->apiHeaders())
            ->assertOk()->assertJsonPath('data.status', 'completed')
            ->assertJsonPath('data.outcome_note', 'Fever controlled; follow up with a pediatrician.');

        $this->actingAsUser($this->patient)->getJson("/api/v1/urgent-requests/{$this->id}", $this->apiHeaders())
            ->assertJsonPath('data.outcome_note', 'Fever controlled; follow up with a pediatrician.')
            ->assertJsonPath('data.time_to_accept_seconds', 0);
        $this->actingAsUser($this->loser->user)->getJson("/api/v1/urgent-requests/{$this->id}", $this->apiHeaders())
            ->assertJsonPath('data.outcome_note', null);

        // History stays readable; no new messages after close.
        $this->actingAsUser($this->patient)->getJson($this->url(), $this->apiHeaders())->assertOk();
        $this->postJson($this->url(), ['body' => 'Thanks!'], $this->apiHeaders())->assertStatus(409)->assertJsonPath('code', 'closed');
    }

    public function test_cancelled_consultation_rejects_new_messages(): void
    {
        $this->accept();
        $this->actingAsUser($this->patient)->postJson("/api/v1/urgent-requests/{$this->id}/cancel", [], $this->apiHeaders())->assertOk();
        $this->actingAsUser($this->winner->user)->postJson($this->url(), ['body' => 'Are you there?'], $this->apiHeaders())
            ->assertStatus(409)->assertJsonPath('code', 'closed');
    }
}
