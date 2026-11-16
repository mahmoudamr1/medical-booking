<?php

namespace Tests\Feature\Urgent;

use App\Jobs\DispatchUrgentRequestJob;
use App\Jobs\FinalizeUrgentRequestJob;
use App\Models\DoctorProfile;
use App\Models\PatientProfile;
use App\Models\Specialty;
use App\Models\UrgentRequest;
use App\Models\User;
use App\Notifications\UrgentNotification;
use App\Services\Settings;
use App\Services\Urgent\UrgentDispatcher;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Notification;
use Tests\Concerns\BuildsVolunteers;
use Tests\TestCase;

class UrgentAssistanceTest extends TestCase
{
    use BuildsVolunteers;

    private Specialty $pediatrics;

    private Specialty $gp;

    protected function setUp(): void
    {
        parent::setUp();
        Notification::fake();
        // Delayed escalation jobs are asserted/driven manually (the test queue is sync).
        Bus::fake([DispatchUrgentRequestJob::class, FinalizeUrgentRequestJob::class]);
        $this->geography();
        $this->pediatrics = Specialty::factory()->create(['slug' => 'pediatrics']);
        $this->gp = Specialty::factory()->create(['slug' => 'general-practice', 'is_general_practice' => true]);
    }

    private function patient(): User
    {
        return PatientProfile::factory()->create()->user;
    }

    private function create(User $patient, array $overrides = [])
    {
        return $this->actingAsUser($patient)->postJson('/api/v1/urgent-requests', $this->urgentPayload($overrides), $this->apiHeaders());
    }

    public function test_life_threatening_flag_is_ignored_and_the_request_is_routed_to_live_doctors(): void
    {
        $doctor = $this->volunteer($this->pediatrics, $this->nasrCity);
        $this->create($this->patient(), ['life_threatening' => true, 'severity' => 'critical'])
            ->assertCreated()->assertJsonPath('data.status', 'notifying')->assertJsonPath('data.severity', 'critical')
            ->assertJsonMissingPath('emergency');
        Notification::assertSentTo($doctor->user, UrgentNotification::class, fn ($n) => $n->event === 'new_request');
    }

    public function test_consent_and_severity_are_required_but_not_the_disclaimer(): void
    {
        $this->create($this->patient(), ['consent' => false, 'severity' => null])
            ->assertUnprocessable()->assertJsonValidationErrors(['consent', 'severity'])
            ->assertJsonMissingValidationErrors(['disclaimer_acknowledged']);
        $this->create($this->patient(), ['severity' => 'catastrophic'])->assertJsonValidationErrors(['severity']);

        $this->volunteer($this->pediatrics, $this->nasrCity);
        $id = $this->create($this->patient())->assertCreated()->json('data.id');
        $this->assertNull(UrgentRequest::find($id)->disclaimer_acknowledged_at);
    }

    public function test_tier1_notifies_only_eligible_volunteers(): void
    {
        $eligible = $this->volunteer($this->pediatrics, $this->nasrCity);
        $otherCity = $this->volunteer($this->pediatrics, $this->maadi);              // tier 2, not tier 1
        $notAvailable = $this->volunteer($this->pediatrics, $this->nasrCity, opts: ['available' => false]);
        $expiredWindow = $this->volunteer($this->pediatrics, $this->nasrCity);
        $expiredWindow->volunteerProfile->availabilities()->update(['starts_at' => now()->subHours(3), 'ends_at' => now()->subMinute()]);
        $inactive = $this->volunteer($this->pediatrics, $this->nasrCity, opts: ['status' => 'inactive']);
        $unverified = $this->volunteer($this->pediatrics, $this->nasrCity);
        $unverified->forceFill(['verification_status' => 'suspended'])->save();
        $offlineOnly = $this->volunteer($this->pediatrics, $this->nasrCity, opts: ['online' => false]);
        $verifiedNotVolunteer = DoctorProfile::factory()->verified()->withSpecialty($this->pediatrics)->create();

        $id = $this->create($this->patient(), ['specialty_id' => $this->pediatrics->id])->assertCreated()
            ->assertJsonPath('data.status', 'notifying')->assertJsonPath('data.current_tier', 1)->json('data.id');

        $notified = UrgentRequest::find($id)->dispatches()->pluck('doctor_profile_id')->all();
        $this->assertSame([$eligible->id], $notified);
        Notification::assertSentTo($eligible->user, UrgentNotification::class, fn ($n) => $n->event === 'new_request');
        foreach ([$otherCity, $notAvailable, $expiredWindow, $inactive, $unverified, $offlineOnly, $verifiedNotVolunteer] as $d) {
            Notification::assertNotSentTo($d->user, UrgentNotification::class);
        }
        Bus::assertDispatched(DispatchUrgentRequestJob::class, fn ($j) => $j->tier === 2);
    }

    public function test_escalation_to_wider_area_then_gp_with_disclosure_then_unmatched(): void
    {
        $wider = $this->volunteer($this->pediatrics, $this->maadi);
        $gp = $this->volunteer($this->gp, null, $this->cairo);
        $id = $this->create($this->patient(), ['specialty_id' => $this->pediatrics->id, 'consultation_type' => 'in_person', 'location_details' => 'Street 9'])
            ->json('data.id');

        // Tier 1 empty → immediately tier 2 (same governorate).
        $r = UrgentRequest::find($id);
        $this->assertSame(2, $r->current_tier);
        $this->assertFalse($r->gp_disclosure);

        app(UrgentDispatcher::class)->runTier($id, 3);
        $r->refresh();
        $this->assertSame(3, $r->current_tier);
        $this->assertTrue($r->gp_disclosure);
        $this->assertEqualsCanonicalizing([$wider->id, $gp->id], $r->dispatches()->pluck('doctor_profile_id')->all());

        // Nobody accepted: kept open (US6) until the deadline, then closed honestly.
        app(UrgentDispatcher::class)->finalize($id);
        $this->assertSame('waiting', $r->refresh()->status->value);
        $this->assertSame('Street 9', $r->location_details);

        $this->travel(31)->minutes();
        app(UrgentDispatcher::class)->finalize($id);
        $r->refresh();
        $this->assertSame('unmatched', $r->status->value);
        $this->assertNull($r->location_details); // minimized on close
        $this->assertSame(0, $r->dispatches()->where('status', 'notified')->count());
        Notification::assertSentTo($r->patientProfile->user, UrgentNotification::class, fn ($n) => $n->event === 'unmatched');
    }

    public function test_no_eligible_volunteer_at_all_is_unmatched_immediately_when_keep_open_is_disabled(): void
    {
        app(Settings::class)->update(['urgent_wait_max_minutes' => 0], null);
        $patient = $this->patient();
        $this->create($patient, ['specialty_id' => $this->pediatrics->id])->assertCreated()->assertJsonPath('data.status', 'unmatched');
        Notification::assertSentTo($patient, UrgentNotification::class, fn ($n) => $n->event === 'unmatched');
        Bus::assertNotDispatched(DispatchUrgentRequestJob::class);
    }

    public function test_dispatched_doctor_sees_redacted_request_until_acceptance(): void
    {
        $a = $this->volunteer($this->pediatrics, $this->nasrCity);
        $b = $this->volunteer($this->pediatrics, $this->nasrCity);
        $patient = $this->patient();
        $id = $this->create($patient, ['specialty_id' => $this->pediatrics->id, 'consultation_type' => 'in_person',
            'location_details' => 'Building 7, floor 3', 'contact_phone' => '01099990000'])->json('data.id');

        $redacted = $this->actingAsUser($a->user)->getJson("/api/v1/urgent-requests/{$id}", $this->apiHeaders())->assertOk();
        $this->assertNull($redacted->json('data.patient'));
        $this->assertNull($redacted->json('data.location_details'));
        $this->assertStringNotContainsString('01099990000', $redacted->getContent());
        $this->assertStringNotContainsString('Building 7', $redacted->getContent());
        $this->assertStringNotContainsString($patient->name, $redacted->getContent());
        $this->assertDatabaseHas('audit_logs', ['action' => 'urgent.request.viewed', 'actor_user_id' => $a->user_id, 'subject_id' => $id]);

        $this->postJson("/api/v1/urgent-requests/{$id}/accept", [], $this->apiHeaders())->assertOk()
            ->assertJsonPath('data.status', 'accepted')
            ->assertJsonPath('data.location_details', 'Building 7, floor 3')
            ->assertJsonPath('data.patient.contact_phone', '01099990000');

        // The loser is told and still sees nothing personal.
        Notification::assertSentTo($b->user, UrgentNotification::class, fn ($n) => $n->event === 'taken');
        $this->actingAsUser($b->user)->postJson("/api/v1/urgent-requests/{$id}/accept", [], $this->apiHeaders())
            ->assertStatus(409);
        $this->getJson("/api/v1/urgent-requests/{$id}", $this->apiHeaders())->assertJsonPath('data.patient', null);

        // Patient now sees the accepted doctor.
        Notification::assertSentTo($patient, UrgentNotification::class, fn ($n) => $n->event === 'accepted');
        $this->actingAsUser($patient)->getJson("/api/v1/urgent-requests/{$id}", $this->apiHeaders())
            ->assertJsonPath('data.accepted_doctor.id', $a->id);
    }

    public function test_non_dispatched_doctor_and_other_patients_cannot_see_request(): void
    {
        $this->volunteer($this->pediatrics, $this->nasrCity);
        $stranger = $this->volunteer($this->pediatrics, null, $this->alex);
        $id = $this->create($this->patient(), ['specialty_id' => $this->pediatrics->id, 'consultation_type' => 'in_person', 'location_details' => 'x'])->json('data.id');

        $this->actingAsUser($stranger->user)->getJson("/api/v1/urgent-requests/{$id}", $this->apiHeaders())->assertNotFound();
        $this->postJson("/api/v1/urgent-requests/{$id}/accept", [], $this->apiHeaders())->assertNotFound();
        $this->actingAsUser($this->patient())->getJson("/api/v1/urgent-requests/{$id}", $this->apiHeaders())->assertNotFound();
    }

    public function test_consultation_lifecycle_and_workload_limit(): void
    {
        $doc = $this->volunteer($this->pediatrics, $this->nasrCity, opts: ['max' => 1]);
        $first = $this->create($this->patient(), ['specialty_id' => $this->pediatrics->id])->json('data.id');
        $this->actingAsUser($doc->user)->postJson("/api/v1/urgent-requests/{$first}/accept", [], $this->apiHeaders())->assertOk();

        // At max workload: not matched for new requests (the request waits for a doctor, US6).
        $second = $this->create($this->patient(), ['specialty_id' => $this->pediatrics->id])->json('data.id');
        $this->assertSame('waiting', UrgentRequest::find($second)->status->value);
        $this->assertSame(0, UrgentRequest::find($second)->dispatches()->count());

        $this->actingAsUser($doc->user)->postJson("/api/v1/urgent-requests/{$first}/complete", [], $this->apiHeaders())->assertStatus(409);
        $this->postJson("/api/v1/urgent-requests/{$first}/start", [], $this->apiHeaders())->assertOk()->assertJsonPath('data.status', 'in_progress');
        $this->postJson("/api/v1/urgent-requests/{$first}/complete", [], $this->apiHeaders())->assertOk()->assertJsonPath('data.status', 'completed');
    }

    public function test_patient_cancel_one_open_request_and_rate_limit(): void
    {
        $this->volunteer($this->pediatrics, $this->nasrCity);
        $patient = $this->patient();
        $id = $this->create($patient)->assertCreated()->json('data.id');
        $this->create($patient)->assertStatus(409)->assertJsonPath('code', 'urgent_open_exists');

        $this->actingAsUser($patient)->postJson("/api/v1/urgent-requests/{$id}/cancel", [], $this->apiHeaders())
            ->assertOk()->assertJsonPath('data.status', 'cancelled');
        $this->assertDatabaseHas('consents', ['user_id' => $patient->id, 'type' => 'urgent_data_sharing']);

        // Settings cap: 3 per hour (third creation already counted above as #1).
        $this->postJson('/api/v1/urgent-requests/'.$this->create($patient)->json('data.id').'/cancel', [], $this->apiHeaders());
        $this->travel(61)->seconds(); // per-minute throttle window
        $this->postJson('/api/v1/urgent-requests/'.$this->create($patient)->json('data.id').'/cancel', [], $this->apiHeaders());
        $this->travel(61)->seconds();
        $this->create($patient)->assertStatus(429);
    }

    public function test_volunteer_opt_in_requires_verification_and_windows_expire(): void
    {
        $unverified = DoctorProfile::factory()->create();
        $payload = ['opt_in' => true, 'specialty_ids' => [$this->pediatrics->id], 'locations' => [['governorate_id' => $this->cairo->id]]];
        $this->actingAsUser($unverified->user)->putJson('/api/v1/doctor/volunteer', $payload, $this->apiHeaders())
            ->assertUnprocessable()->assertJsonPath('code', 'not_verified');

        $doctor = DoctorProfile::factory()->verified()->create();
        $this->actingAsUser($doctor->user)->putJson('/api/v1/doctor/volunteer', $payload + ['accepts_in_person' => true], $this->apiHeaders())
            ->assertOk()->assertJsonPath('data.opted_in', true)->assertJsonPath('data.available_now', false);

        $this->postJson('/api/v1/doctor/volunteer/availability', ['kind' => 'now', 'hours' => 2, 'mode' => 'online'], $this->apiHeaders())
            ->assertCreated()->assertJsonPath('data.available_now', true);
        $this->postJson('/api/v1/doctor/volunteer/availability', ['kind' => 'scheduled', 'mode' => 'online',
            'starts_at' => now()->addHour()->toIso8601String(), 'ends_at' => now()->addHours(30)->toIso8601String()], $this->apiHeaders())
            ->assertUnprocessable();

        $this->travel(3)->hours(); // window ended on its own
        $this->getJson('/api/v1/doctor/volunteer', $this->apiHeaders())->assertJsonPath('data.available_now', false);

        $this->postJson('/api/v1/doctor/volunteer/availability', ['kind' => 'now', 'hours' => 1, 'mode' => 'both'], $this->apiHeaders());
        $this->deleteJson('/api/v1/doctor/volunteer/availability', [], $this->apiHeaders())->assertJsonPath('data.available_now', false);

        $this->putJson('/api/v1/doctor/volunteer', ['opt_in' => false], $this->apiHeaders())->assertJsonPath('data.opted_in', false);
    }

    public function test_doctor_can_report_abuse_and_sweeper_finalizes_overdue(): void
    {
        $doc = $this->volunteer($this->pediatrics, $this->nasrCity);
        $id = $this->create($this->patient())->json('data.id');

        $this->actingAsUser($doc->user)->postJson("/api/v1/urgent-requests/{$id}/report", ['reason' => 'prank request'], $this->apiHeaders())->assertOk();
        $this->assertNotNull(UrgentRequest::find($id)->flagged_at);

        // Lost jobs: the sweeper keeps the request open until its deadline, then closes it.
        $this->travel(20)->minutes();
        $this->artisan('urgent:sweep')->assertSuccessful();
        $this->assertSame('waiting', UrgentRequest::find($id)->status->value);
        $this->travel(11)->minutes();
        $this->artisan('urgent:sweep')->assertSuccessful();
        $this->assertSame('unmatched', UrgentRequest::find($id)->status->value);
    }

    public function test_doctor_inbox_carries_counts_for_every_tab(): void
    {
        $doctor = $this->volunteer($this->pediatrics, $this->nasrCity, opts: ['max' => 3]);
        $payload = ['specialty_id' => $this->pediatrics->id];
        $accepted = $this->create($this->patient(), $payload)->assertCreated()->json('data.id');
        $this->create($this->patient(), $payload)->assertCreated();
        $closed = $this->create($this->patient(), $payload)->assertCreated()->json('data.id');
        $this->postJson("/api/v1/urgent-requests/{$closed}/cancel", [], $this->apiHeaders())->assertOk();
        $this->actingAsUser($doctor->user)->postJson("/api/v1/urgent-requests/{$accepted}/accept", [], $this->apiHeaders())->assertOk();

        $counts = ['open' => 1, 'accepted' => 1, 'closed' => 1];
        $this->getJson('/api/v1/doctor/urgent-requests', $this->apiHeaders())
            ->assertOk()->assertJsonCount(3, 'data')->assertJsonPath('meta.counts', $counts);
        $this->getJson('/api/v1/doctor/urgent-requests?status=open', $this->apiHeaders())
            ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('meta.pagination.total', 1)
            ->assertJsonPath('meta.counts', $counts);
    }

    public function test_urgent_ip_rate_limit_is_configurable(): void
    {
        config(['app.urgent_ip_rate_limit' => 1]);
        $this->volunteer($this->pediatrics, $this->nasrCity);

        $this->create($this->patient())->assertCreated();
        // A different patient from the same IP: only the per-IP hourly limit applies.
        $this->create($this->patient())->assertStatus(429)->assertJsonPath('code', 'rate_limited');
    }
}
