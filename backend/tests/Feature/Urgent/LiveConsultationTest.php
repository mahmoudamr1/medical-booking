<?php

namespace Tests\Feature\Urgent;

use App\Enums\ClinicRole;
use App\Jobs\DispatchUrgentRequestJob;
use App\Jobs\FinalizeUrgentRequestJob;
use App\Models\Clinic;
use App\Models\ClinicBranch;
use App\Models\ClinicMembership;
use App\Models\DoctorBranchAffiliation;
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
use Illuminate\Testing\TestResponse;
use Tests\Concerns\BuildsVolunteers;
use Tests\TestCase;

/** Spec 002: critical wave, directed requests, live availability (public, admin, clinic), no emergency redirect. */
class LiveConsultationTest extends TestCase
{
    use BuildsVolunteers;

    private Specialty $pediatrics;

    private Specialty $cardiology;

    private Specialty $gp;

    protected function setUp(): void
    {
        parent::setUp();
        Notification::fake();
        Bus::fake([DispatchUrgentRequestJob::class, FinalizeUrgentRequestJob::class]);
        $this->geography();
        $this->pediatrics = Specialty::factory()->create(['slug' => 'pediatrics']);
        $this->cardiology = Specialty::factory()->create(['slug' => 'cardiology']);
        $this->gp = Specialty::factory()->create(['slug' => 'general-practice', 'is_general_practice' => true]);
    }

    private function patient(): User
    {
        return PatientProfile::factory()->create()->user;
    }

    /** @param array<string, mixed> $overrides */
    private function create(User $patient, array $overrides = []): TestResponse
    {
        return $this->actingAsUser($patient)->postJson('/api/v1/urgent-requests', $this->urgentPayload($overrides), $this->apiHeaders());
    }

    /** @return list<string> */
    private function notifiedIds(string $requestId): array
    {
        return UrgentRequest::findOrFail($requestId)->dispatches()->orderBy('id')->pluck('doctor_profile_id')->all();
    }

    // ---- Critical wave ---------------------------------------------------------------

    public function test_critical_request_reaches_every_eligible_doctor_in_one_wave(): void
    {
        $pediatrician = $this->volunteer($this->pediatrics, $this->nasrCity);
        $cardiologist = $this->volunteer($this->cardiology, $this->maadi);
        $gp = $this->volunteer($this->gp, null, $this->cairo);
        $alexOnline = $this->volunteer($this->cardiology, null, $this->alex);           // online → nationwide
        $unavailable = $this->volunteer($this->gp, $this->nasrCity, opts: ['available' => false]);

        $id = $this->create($this->patient(), ['severity' => 'critical', 'specialty_id' => $this->pediatrics->id])
            ->assertCreated()->assertJsonPath('data.status', 'notifying')->assertJsonPath('data.current_tier', 1)
            ->assertJsonPath('data.gp_disclosure', true)->json('data.id');

        $this->assertEqualsCanonicalizing([$pediatrician->id, $cardiologist->id, $gp->id, $alexOnline->id], $this->notifiedIds($id));
        Notification::assertNotSentTo($unavailable->user, UrgentNotification::class);
        // A single wave: no later tiers, only the final availability check after the critical timeout.
        Bus::assertNotDispatched(DispatchUrgentRequestJob::class);
        Bus::assertDispatched(FinalizeUrgentRequestJob::class);

        // Nobody accepted: the request is kept open for a doctor to become available (US6).
        app(UrgentDispatcher::class)->finalize($id);
        $this->assertSame('waiting', UrgentRequest::find($id)->status->value);
    }

    public function test_critical_in_person_request_stays_within_the_governorate(): void
    {
        $cairo = $this->volunteer($this->cardiology, $this->maadi);
        $alex = $this->volunteer($this->cardiology, null, $this->alex);

        $id = $this->create($this->patient(), ['severity' => 'critical', 'consultation_type' => 'in_person', 'location_details' => 'Street 9'])
            ->assertCreated()->json('data.id');

        $this->assertSame([$cairo->id], $this->notifiedIds($id));
        Notification::assertNotSentTo($alex->user, UrgentNotification::class);
    }

    // ---- Directed requests ------------------------------------------------------------

    public function test_directed_request_notifies_only_the_preferred_doctor_and_decline_falls_back_immediately(): void
    {
        $preferred = $this->volunteer($this->cardiology, $this->maadi);
        $other = $this->volunteer($this->pediatrics, $this->nasrCity);

        $id = $this->create($this->patient(), ['preferred_doctor_id' => $preferred->id, 'specialty_id' => $this->pediatrics->id])
            ->assertCreated()->assertJsonPath('data.current_tier', 0)
            ->assertJsonPath('data.preferred_doctor.id', $preferred->id)->json('data.id');
        $this->assertSame([$preferred->id], $this->notifiedIds($id));
        Notification::assertNotSentTo($other->user, UrgentNotification::class);
        Bus::assertDispatched(DispatchUrgentRequestJob::class, fn ($j) => $j->tier === 1);

        $this->actingAsUser($preferred->user)->getJson('/api/v1/doctor/urgent-requests?status=open', $this->apiHeaders())
            ->assertJsonPath('data.0.directed_to_me', true);
        $this->postJson("/api/v1/urgent-requests/{$id}/decline", [], $this->apiHeaders())->assertOk();

        $this->assertSame([$preferred->id, $other->id], $this->notifiedIds($id));
        $this->assertSame(1, UrgentRequest::find($id)->current_tier);
        Notification::assertSentTo($other->user, UrgentNotification::class, fn ($n) => $n->event === 'new_request');

        // The directed timeout job firing later is a no-op: the broadcast step already ran.
        app(UrgentDispatcher::class)->runTier($id, 1);
        $this->assertCount(2, $this->notifiedIds($id));
    }

    public function test_directed_request_falls_back_after_the_directed_timeout(): void
    {
        $preferred = $this->volunteer($this->pediatrics, $this->maadi);
        $other = $this->volunteer($this->pediatrics, $this->nasrCity);
        $id = $this->create($this->patient(), ['preferred_doctor_id' => $preferred->id, 'specialty_id' => $this->pediatrics->id])->json('data.id');
        $this->assertSame([$preferred->id], $this->notifiedIds($id));

        // Drive the delayed job (urgent_directed_timeout_seconds) manually.
        app(UrgentDispatcher::class)->runTier($id, 1);
        $this->assertSame([$preferred->id, $other->id], $this->notifiedIds($id));

        // The directed doctor can still accept while the request is open.
        $this->actingAsUser($preferred->user)->postJson("/api/v1/urgent-requests/{$id}/accept", [], $this->apiHeaders())
            ->assertOk()->assertJsonPath('data.status', 'accepted');
    }

    public function test_directed_doctor_going_unavailable_falls_back_immediately(): void
    {
        $preferred = $this->volunteer($this->pediatrics, $this->nasrCity);
        $other = $this->volunteer($this->pediatrics, $this->nasrCity);
        $id = $this->create($this->patient(), ['preferred_doctor_id' => $preferred->id])->json('data.id');

        $this->actingAsUser($preferred->user)->deleteJson('/api/v1/doctor/volunteer/availability', [], $this->apiHeaders())->assertOk();

        $this->assertSame([$preferred->id, $other->id], $this->notifiedIds($id));
        $this->assertDatabaseHas('urgent_request_dispatches', ['urgent_request_id' => $id, 'doctor_profile_id' => $preferred->id, 'status' => 'expired']);
    }

    public function test_preferred_doctor_who_is_not_available_now_is_rejected(): void
    {
        $offline = $this->volunteer($this->pediatrics, $this->nasrCity, opts: ['available' => false]);
        $notVolunteer = DoctorProfile::factory()->verified()->create();
        $patient = $this->patient();

        foreach ([$offline, $notVolunteer] as $doctor) {
            $this->create($patient, ['preferred_doctor_id' => $doctor->id])
                ->assertUnprocessable()->assertJsonPath('code', 'preferred_doctor_unavailable');
        }
        $this->create($patient, ['preferred_doctor_id' => '01JZZZZZZZZZZZZZZZZZZZZZZZ'])->assertJsonValidationErrors(['preferred_doctor_id']);
        $this->assertSame(0, UrgentRequest::count());
        $this->assertDatabaseMissing('consents', ['user_id' => $patient->id, 'type' => 'urgent_data_sharing']);
    }

    // ---- Live availability -------------------------------------------------------------

    public function test_available_doctors_list_shows_only_doctors_who_can_take_a_request_now(): void
    {
        $available = $this->volunteer($this->pediatrics, $this->nasrCity, opts: ['mode' => 'online', 'in_person' => false]);
        $both = $this->volunteer($this->cardiology, null, $this->alex);
        $expired = $this->volunteer($this->pediatrics, $this->nasrCity);
        $expired->volunteerProfile->availabilities()->update(['starts_at' => now()->subHours(3), 'ends_at' => now()->subMinute()]);
        $unverified = $this->volunteer($this->pediatrics, $this->nasrCity);
        $unverified->forceFill(['verification_status' => 'suspended'])->save();
        $optedOut = $this->volunteer($this->pediatrics, $this->nasrCity, opts: ['status' => 'inactive']);
        $fullLoad = $this->volunteer($this->gp, $this->nasrCity, opts: ['max' => 1]);
        $busyId = $this->create($this->patient(), ['specialty_id' => $this->gp->id])->json('data.id');
        $this->actingAsUser($fullLoad->user)->postJson("/api/v1/urgent-requests/{$busyId}/accept", [], $this->apiHeaders())->assertOk();

        $res = $this->getJson('/api/v1/urgent/available-doctors', $this->apiHeaders())->assertOk()->assertJsonPath('data.count', 2);
        $this->assertEqualsCanonicalizing([$available->id, $both->id], array_column($res->json('data.doctors'), 'id'));
        foreach ([$expired, $unverified, $optedOut, $fullLoad] as $hidden) {
            $this->assertNotContains($hidden->id, array_column($res->json('data.doctors'), 'id'));
        }
        $row = collect($res->json('data.doctors'))->firstWhere('id', $available->id);
        $this->assertSame(['online'], $row['modes']);
        $this->assertSame(['active' => 0, 'max' => 1], $row['load']);
        $this->assertSame('pediatrics', $row['specialties'][0]['slug']);
        $this->assertNotNull($row['available_until']);
        $this->assertStringNotContainsString($available->user->email, $res->getContent());
        $this->assertStringNotContainsString('"phone"', $res->getContent());
        $this->assertStringNotContainsString('license', $res->getContent());

        $this->getJson('/api/v1/urgent/available-doctors?specialty=pediatrics', $this->apiHeaders())
            ->assertJsonPath('data.count', 1)->assertJsonPath('data.doctors.0.id', $available->id);
        $this->getJson("/api/v1/urgent/available-doctors?specialty={$this->cardiology->id}&mode=in_person", $this->apiHeaders())
            ->assertJsonPath('data.count', 1)->assertJsonPath('data.doctors.0.id', $both->id);
        $this->getJson("/api/v1/urgent/available-doctors?governorate={$this->alex->id}", $this->apiHeaders())
            ->assertJsonPath('data.count', 1);
    }

    public function test_admin_live_board_reports_current_numbers(): void
    {
        $this->freezeTime();
        $this->volunteer($this->pediatrics, $this->nasrCity);
        $busy = $this->volunteer($this->pediatrics, $this->nasrCity, opts: ['max' => 2]);

        $accepted = $this->create($this->patient(), ['severity' => 'standard'])->json('data.id');
        $this->travel(30)->seconds();
        $this->actingAsUser($busy->user)->postJson("/api/v1/urgent-requests/{$accepted}/accept", [], $this->apiHeaders())->assertOk();
        $this->create($this->patient(), ['severity' => 'critical'])->assertCreated();
        $flagged = $this->create($this->patient())->json('data.id');
        $this->actingAsUser($busy->user)->postJson("/api/v1/urgent-requests/{$flagged}/report", ['reason' => 'prank request'], $this->apiHeaders());
        app(Settings::class)->update(['urgent_wait_max_minutes' => 0], null); // no keep-open: closes at once
        $this->create($this->patient(), ['consultation_type' => 'in_person', 'location_details' => 'x', 'governorate_id' => $this->alex->id, 'city_id' => null])
            ->assertJsonPath('data.status', 'unmatched');
        $this->travel(10)->seconds();

        $admin = User::factory()->admin()->create();
        $this->actingAsUser($admin)->getJson('/api/v1/admin/urgent/live', $this->apiHeaders())->assertOk()
            ->assertJsonPath('data.available_doctors', 2)
            ->assertJsonPath('data.open', ['critical' => 1, 'urgent' => 1, 'standard' => 0])
            ->assertJsonPath('data.oldest_waiting_seconds', 10)
            ->assertJsonPath('data.avg_time_to_accept_seconds_today', 30)
            ->assertJsonPath('data.unmatched_last_24h', 1)
            ->assertJsonPath('data.flagged_open', 1)
            ->assertJsonCount(2, 'data.doctors')
            ->assertJsonCount(3, 'data.open_requests')
            ->assertJsonPath('data.open_requests.0.severity', 'critical');

        $this->actingAsUser($this->patient())->getJson('/api/v1/admin/urgent/live', $this->apiHeaders())->assertForbidden();
    }

    /** Several rows on purpose: strict mode reports lazy loading only when a collection has more than one model. */
    public function test_admin_urgent_request_list_and_detail_render_v2_fields(): void
    {
        $this->freezeTime();
        $preferred = $this->volunteer($this->pediatrics, $this->nasrCity);
        $this->volunteer($this->cardiology, $this->nasrCity);

        $directed = $this->create($this->patient(), ['preferred_doctor_id' => $preferred->id, 'severity' => 'standard'])->json('data.id');
        $this->actingAsUser($preferred->user)->postJson("/api/v1/urgent-requests/{$directed}/accept", [], $this->apiHeaders())->assertOk();
        $this->postJson("/api/v1/urgent-requests/{$directed}/start", [], $this->apiHeaders())->assertOk();
        $this->postJson("/api/v1/urgent-requests/{$directed}/complete", ['outcome_note' => 'Advised rest.'], $this->apiHeaders())->assertOk();
        $critical = $this->create($this->patient(), ['severity' => 'critical'])->json('data.id');
        $this->create($this->patient())->assertCreated();

        $admin = User::factory()->admin()->create();
        $res = $this->actingAsUser($admin)->getJson('/api/v1/admin/urgent-requests', $this->apiHeaders())
            ->assertOk()->assertJsonCount(3, 'data');
        $row = collect($res->json('data'))->firstWhere('id', $directed);
        $this->assertSame('standard', $row['severity']);
        $this->assertSame(['id' => $preferred->id, 'name' => $preferred->user->name], $row['preferred_doctor']);
        $this->assertSame($preferred->id, $row['accepted_doctor']['id']);
        $this->assertSame('Advised rest.', $row['outcome_note']);
        $this->assertSame(0, $row['time_to_accept_seconds']);
        $this->assertSame(0, $row['unread_messages']);
        $this->assertSame('critical', collect($res->json('data'))->firstWhere('id', $critical)['severity']);

        $this->getJson("/api/v1/admin/urgent-requests/{$directed}", $this->apiHeaders())->assertOk()
            ->assertJsonPath('data.preferred_doctor.id', $preferred->id)
            ->assertJsonPath('data.outcome_note', 'Advised rest.');
    }

    public function test_clinic_sees_only_its_affiliated_volunteers_and_who_is_available(): void
    {
        $clinic = Clinic::factory()->create();
        $branch = ClinicBranch::factory()->create(['clinic_id' => $clinic->id]);
        $availableNow = $this->volunteer($this->pediatrics, $this->nasrCity);
        $offline = $this->volunteer($this->gp, $this->nasrCity, opts: ['available' => false]);
        $notAffiliated = $this->volunteer($this->pediatrics, $this->nasrCity);
        $notVolunteer = DoctorProfile::factory()->verified()->create();
        foreach ([$availableNow, $offline, $notVolunteer] as $doctor) {
            DoctorBranchAffiliation::create(['doctor_profile_id' => $doctor->id, 'clinic_branch_id' => $branch->id,
                'clinic_id' => $clinic->id, 'status' => 'active']);
        }

        $res = $this->actingAsUser($clinic->owner)->getJson("/api/v1/clinics/{$clinic->id}/urgent-availability", $this->apiHeaders())
            ->assertOk()->assertJsonPath('data.volunteers_total', 2)
            ->assertJsonPath('data.doctors.0.id', $availableNow->id)
            ->assertJsonPath('data.doctors.0.available_now', true)
            ->assertJsonPath('data.doctors.0.affiliated_branch.id', $branch->id)
            ->assertJsonPath('data.doctors.1.id', $offline->id)
            ->assertJsonPath('data.doctors.1.available_now', false)
            ->assertJsonPath('data.doctors.1.available_until', null);
        $this->assertStringNotContainsString($notAffiliated->id, $res->getContent());

        // Tenant boundary: another clinic's owner and a non-active member get 404; staff with schedules.view see it.
        $otherClinic = Clinic::factory()->create();
        $this->actingAsUser($otherClinic->owner)->getJson("/api/v1/clinics/{$clinic->id}/urgent-availability", $this->apiHeaders())
            ->assertNotFound();
        $invited = User::factory()->create();
        ClinicMembership::create(['clinic_id' => $clinic->id, 'user_id' => $invited->id, 'role' => ClinicRole::Manager, 'status' => 'invited']);
        $this->actingAsUser($invited)->getJson("/api/v1/clinics/{$clinic->id}/urgent-availability", $this->apiHeaders())
            ->assertNotFound();
        $receptionist = User::factory()->create();
        ClinicMembership::create(['clinic_id' => $clinic->id, 'user_id' => $receptionist->id, 'role' => ClinicRole::Receptionist, 'status' => 'active']);
        $this->actingAsUser($receptionist)->getJson("/api/v1/clinics/{$clinic->id}/urgent-availability", $this->apiHeaders())
            ->assertOk()->assertJsonPath('data.volunteers_total', 2);
    }

    // ---- No emergency redirect --------------------------------------------------------

    public function test_no_urgent_response_or_notification_mentions_an_emergency_number(): void
    {
        $this->volunteer($this->pediatrics, $this->nasrCity);
        $patient = $this->patient();

        $responses = [
            $this->getJson('/api/v1/settings/public', $this->apiHeaders())->assertOk(),
            $this->getJson('/api/v1/home', $this->apiHeaders())->assertOk(),
            $this->getJson('/api/v1/urgent/available-doctors', $this->apiHeaders())->assertOk(),
            $this->create($patient, ['severity' => 'critical', 'contact_phone' => '01099990000'])->assertCreated(),
        ];
        $id = $responses[3]->json('data.id');
        app(UrgentDispatcher::class)->finalize($id); // → waiting
        $responses[] = $this->actingAsUser($patient)->getJson("/api/v1/urgent-requests/{$id}", $this->apiHeaders())->assertOk();
        $this->travel(31)->minutes();
        app(UrgentDispatcher::class)->finalize($id); // keep-open deadline passed → unmatched
        $responses[] = $this->getJson("/api/v1/urgent-requests/{$id}", $this->apiHeaders())->assertOk();

        foreach ($responses as $res) {
            $this->assertStringNotContainsStringIgnoringCase('emergency', $res->getContent());
            $this->assertStringNotContainsString('"123"', $res->getContent());
        }
        Notification::assertSentTo($patient, UrgentNotification::class, function (UrgentNotification $n) use ($patient) {
            $text = strtolower(json_encode($n->toArray($patient)['i18n'], JSON_UNESCAPED_UNICODE));

            return $n->event === 'waiting' && ! str_contains($text, '123') && ! str_contains($text, 'emergency')
                && ! str_contains($text, 'ambulance') && str_contains($text, 'regular appointment');
        });
        Notification::assertSentTo($patient, UrgentNotification::class, function (UrgentNotification $n) use ($patient) {
            $text = json_encode($n->toArray($patient), JSON_UNESCAPED_UNICODE);

            return $n->event === 'unmatched' && ! str_contains($text, '123') && ! str_contains(strtolower($text), 'emergency')
                && str_contains($text, 'regular appointment');
        });
    }
}
