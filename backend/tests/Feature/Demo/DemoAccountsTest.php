<?php

namespace Tests\Feature\Demo;

use App\Actions\Reviews\ReviewActions;
use App\Enums\AppointmentStatus;
use App\Models\Appointment;
use App\Models\Clinic;
use App\Models\Review;
use App\Models\User;
use Database\Seeders\DemoActivitySeeder;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/** Spec: claude/amdin-dasboard.md — demo accounts exist, log in, land on the right area, permissions hold. */
class DemoAccountsTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        // demo:seed writes avatars/logos/documents; keep tests from touching real storage.
        Storage::fake('public');
        Storage::fake('local');
    }

    private function seedDemo(): void
    {
        $this->artisan('demo:seed')->assertSuccessful();
    }

    /** Real password login (POST /auth/login), then continue as that user for subsequent requests. */
    private function login(string $key): void
    {
        $this->app['auth']->forgetGuards();
        $a = config("demo.accounts.$key");
        $this->flushSession();
        $res = $this->postJson('/api/v1/auth/login', ['email' => $a['email'], 'password' => $a['password']], $this->apiHeaders())
            ->assertOk()->assertJsonPath('data.email', $a['email']);
        $this->actingAsUser(User::findOrFail($res->json('data.id')));
    }

    public function test_demo_seed_is_idempotent(): void
    {
        $this->seedDemo();
        $counts = fn () => [User::count(), Appointment::count(), DB::table('reviews')->count(), DB::table('urgent_requests')->count(),
            DB::table('volunteer_profiles')->count(), DB::table('clinic_memberships')->count(), DB::table('doctor_documents')->count()];
        $first = $counts();
        $this->seedDemo();
        $this->assertSame($first, $counts());
        $this->assertGreaterThanOrEqual(14, $first[1]);
    }

    public function test_all_seven_accounts_log_in_with_expected_roles_and_access(): void
    {
        $this->seedDemo();

        $expect = [
            'admin' => [['admin'], '/api/v1/admin/stats'],
            'patient' => [['patient'], '/api/v1/patient/appointments'],
            'doctor' => [['patient', 'doctor'], '/api/v1/doctor/dashboard'],
            'volunteer' => [['patient', 'doctor'], '/api/v1/doctor/urgent-requests'],
            'pending' => [['patient', 'doctor'], '/api/v1/doctor/profile'],
            'owner' => [['patient'], '/api/v1/my/clinics'],
            'reception' => [['patient'], '/api/v1/my/clinics'],
        ];
        foreach ($expect as $key => [$roles, $url]) {
            $this->login($key);
            $me = $this->getJson('/api/v1/auth/me', $this->apiHeaders())->assertOk();
            $this->assertEqualsCanonicalizing($roles, $me->json('data.roles'), "$key roles");
            $this->getJson($url, $this->apiHeaders())->assertOk();
        }

        // Account-specific state
        $this->login('volunteer');
        $this->getJson('/api/v1/doctor/volunteer', $this->apiHeaders())->assertJsonPath('data.opted_in', true)->assertJsonPath('data.available_now', true);
        $this->login('pending');
        $this->getJson('/api/v1/auth/me', $this->apiHeaders())->assertJsonPath('data.doctor_profile.verification_status', 'pending');
        $this->login('owner');
        $this->getJson('/api/v1/auth/me', $this->apiHeaders())->assertJsonPath('data.clinics.0.role', 'owner');
        $this->login('reception');
        $this->getJson('/api/v1/auth/me', $this->apiHeaders())->assertJsonPath('data.clinics.0.role', 'receptionist');
        $clinicId = $this->getJson('/api/v1/auth/me', $this->apiHeaders())->json('data.clinics.0.id');
        $this->getJson("/api/v1/clinics/{$clinicId}/appointments", $this->apiHeaders())->assertOk();
        $this->getJson("/api/v1/clinics/{$clinicId}/staff", $this->apiHeaders())->assertForbidden(); // receptionist can't manage staff
    }

    public function test_unauthorized_areas_are_blocked_for_each_role(): void
    {
        $this->seedDemo();
        foreach (['patient', 'doctor', 'volunteer', 'pending', 'owner', 'reception'] as $key) {
            $this->login($key);
            $this->getJson('/api/v1/admin/stats', $this->apiHeaders())->assertForbidden();
        }
        foreach (['patient', 'owner', 'reception'] as $key) {
            $this->login($key);
            $this->getJson('/api/v1/doctor/dashboard', $this->apiHeaders())->assertForbidden();
        }
        $this->login('patient');
        $alShifa = Clinic::where('slug', 'al-shifa-medical-center')->value('id');
        $this->getJson("/api/v1/clinics/{$alShifa}/appointments", $this->apiHeaders())->assertNotFound();
    }

    public function test_dashboards_have_real_demo_data(): void
    {
        $this->seedDemo();
        $this->login('admin');
        $stats = $this->getJson('/api/v1/admin/stats?from=2000-01-01&to=2100-01-01', $this->apiHeaders())->json('data');
        $this->assertGreaterThan(0, $stats['appointments']['completed']);
        $this->assertGreaterThan(0, $stats['people']['pending_verifications']);
        $this->getJson('/api/v1/admin/urgent-requests?flagged=1', $this->apiHeaders())->assertJsonCount(1, 'data');
        $this->getJson('/api/v1/admin/review-reports', $this->apiHeaders())->assertJsonCount(1, 'data');

        $this->login('patient');
        $summary = $this->getJson('/api/v1/patient/appointments/summary', $this->apiHeaders())->json('data');
        foreach (['upcoming', 'pending', 'completed', 'cancelled'] as $group) {
            $this->assertGreaterThan(0, $summary[$group], "patient has $group appointments");
        }
        $this->login('doctor');
        $this->assertGreaterThan(0, $this->getJson('/api/v1/doctor/dashboard', $this->apiHeaders())->json('data.counts.completed'));
    }

    /** E2E reviews.spec.ts: the rating fixtures are completed visits of the demo patient, reviewable after every seed. */
    public function test_rating_fixtures_are_reviewable_again_after_every_seed(): void
    {
        $this->seedDemo();
        $patient = User::where('email', config('demo.accounts.patient.email'))->firstOrFail();
        $fixtures = Appointment::with('patientProfile')->whereIn('reference', DemoActivitySeeder::RATING_FIXTURES)->get();
        $this->assertCount(count(DemoActivitySeeder::RATING_FIXTURES), $fixtures);
        foreach ($fixtures as $fixture) {
            $this->assertSame(AppointmentStatus::Completed, $fixture->status, $fixture->reference);
            $this->assertSame($patient->id, $fixture->patientProfile->user_id, $fixture->reference);
        }

        $reviewed = $fixtures->firstOrFail();
        app(ReviewActions::class)->create($reviewed, $patient, 5, 'Reviewed by an earlier E2E run');
        $this->seedDemo();
        $this->assertSame(0, Review::whereIn('appointment_id', $fixtures->pluck('id'))->count());

        $this->login('patient');
        $this->getJson("/api/v1/appointments/{$reviewed->id}", $this->apiHeaders())
            ->assertOk()->assertJsonPath('data.can.review', true);
    }

    public function test_production_guards(): void
    {
        $this->app['env'] = 'production';
        $this->artisan('demo:seed')->assertFailed();
        $this->assertSame(0, User::where('email', 'admin@example.test')->count());

        User::factory()->create(['email' => 'admin@example.test', 'password' => 'whatever-123']);
        $this->withoutMiddleware(ValidateCsrfToken::class)->postJson('/api/v1/auth/login', ['email' => 'admin@example.test', 'password' => 'whatever-123'], $this->apiHeaders())
            ->assertUnprocessable();
        $this->app['env'] = 'testing';
    }
}
