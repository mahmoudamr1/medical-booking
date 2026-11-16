<?php

namespace Tests\Feature\Directory;

use App\Enums\RoleName;
use App\Models\AuditLog;
use App\Models\DoctorProfile;
use App\Models\Specialty;
use App\Models\User;
use App\Notifications\DoctorVerificationRequested;
use App\Notifications\DoctorVerificationResult;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class DoctorVerificationTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        Storage::fake('public');
        Notification::fake();
    }

    /**
     * A real temp file (not UploadedFile::fake(), which reports MIME from the extension), so the
     * content-sniffing (finfo) path used for production uploads is exercised.
     */
    private function realUpload(string $name, string $content): UploadedFile
    {
        $path = tempnam(sys_get_temp_dir(), 'upl');
        file_put_contents($path, $content);

        return new UploadedFile($path, $name, null, null, true);
    }

    private function pdf(string $name = 'license.pdf'): UploadedFile
    {
        return $this->realUpload($name, "%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");
    }

    public function test_full_onboarding_to_public_visibility(): void
    {
        $admin = User::factory()->admin()->create();
        $specialty = Specialty::factory()->create();
        $doctor = DoctorProfile::factory()->create(['license_number' => null]);
        $user = $doctor->user;

        // Incomplete submission is rejected with the missing items listed.
        $this->actingAsUser($user)->postJson('/api/v1/doctor/verification/submit')
            ->assertUnprocessable()->assertJsonPath('code', 'verification_incomplete')
            ->assertJsonStructure(['errors' => ['license_number', 'specialties', 'documents']]);

        $this->putJson('/api/v1/doctor/profile', ['license_number' => 'EG-12345', 'title_en' => 'Cardiologist'])->assertOk();
        $this->putJson('/api/v1/doctor/specialties', ['specialty_ids' => [$specialty->id], 'primary_id' => $specialty->id])->assertOk();
        $docId = $this->post('/api/v1/doctor/documents', ['type' => 'license', 'file' => $this->pdf()], ['Accept' => 'application/json'])
            ->assertCreated()->json('data.id');

        $this->postJson('/api/v1/doctor/verification/submit')->assertOk()->assertJsonPath('data.verification_status', 'pending');
        Notification::assertSentTo($admin, DoctorVerificationRequested::class);
        $this->getJson("/api/v1/doctors/{$doctor->id}")->assertNotFound();

        // Doctor cannot approve themselves (not an admin).
        $this->postJson("/api/v1/admin/doctors/{$doctor->id}/approve")->assertForbidden();

        // Admin reviews the private document (audited) and approves.
        $this->actingAsUser($admin)->get("/api/v1/admin/doctors/{$doctor->id}/documents/{$docId}/download")->assertOk();
        $this->assertDatabaseHas('audit_logs', ['action' => 'doctor.document.viewed', 'actor_user_id' => $admin->id]);
        $this->postJson("/api/v1/admin/doctors/{$doctor->id}/approve")->assertOk()->assertJsonPath('data.verification_status', 'approved');

        $this->assertDatabaseHas('audit_logs', ['action' => 'doctor.verification.approve', 'subject_id' => $doctor->id, 'actor_user_id' => $admin->id]);
        Notification::assertSentTo($user, DoctorVerificationResult::class);
        $this->getJson("/api/v1/doctors/{$doctor->id}")->assertOk()->assertJsonPath('data.verified', true);
    }

    public function test_reject_requires_notes_and_allows_resubmission(): void
    {
        $admin = User::factory()->admin()->create();
        $doctor = DoctorProfile::factory()->pending()->create();

        $this->actingAsUser($admin)->postJson("/api/v1/admin/doctors/{$doctor->id}/reject")->assertUnprocessable();
        $this->postJson("/api/v1/admin/doctors/{$doctor->id}/reject", ['notes' => 'License unreadable'])
            ->assertOk()->assertJsonPath('data.verification_status', 'rejected');
        // Invalid transition: cannot reinstate a rejected doctor.
        $this->postJson("/api/v1/admin/doctors/{$doctor->id}/reinstate")->assertStatus(409)->assertJsonPath('code', 'invalid_transition');
        $this->actingAsUser($doctor->user)->getJson('/api/v1/doctor/profile')->assertJsonPath('data.verification_notes', 'License unreadable');
    }

    public function test_suspend_hides_doctor_and_reinstate_restores(): void
    {
        $admin = User::factory()->admin()->create();
        $doctor = DoctorProfile::factory()->verified()->create();
        $this->getJson("/api/v1/doctors/{$doctor->id}")->assertOk();

        $this->actingAsUser($admin)->postJson("/api/v1/admin/doctors/{$doctor->id}/suspend", ['notes' => 'complaints'])->assertOk();
        $this->getJson("/api/v1/doctors/{$doctor->id}")->assertNotFound();
        $this->postJson("/api/v1/admin/doctors/{$doctor->id}/reinstate")->assertOk();
        $this->getJson("/api/v1/doctors/{$doctor->id}")->assertOk();
        $this->assertSame(2, AuditLog::where('subject_id', $doctor->id)->count());
    }

    public function test_admin_cannot_review_own_doctor_profile(): void
    {
        $doctor = DoctorProfile::factory()->pending()->create();
        $doctor->user->assignRole(RoleName::Admin);

        $this->actingAsUser($doctor->user)->postJson("/api/v1/admin/doctors/{$doctor->id}/approve")
            ->assertStatus(409)->assertJsonPath('code', 'self_review');
    }

    public function test_verified_license_number_is_locked(): void
    {
        $doctor = DoctorProfile::factory()->verified()->create(['license_number' => 'EG-1']);
        $this->actingAsUser($doctor->user)->putJson('/api/v1/doctor/profile', ['license_number' => 'EG-2'])
            ->assertUnprocessable()->assertJsonPath('code', 'locked_fields');
        $this->putJson('/api/v1/doctor/profile', ['bio_en' => 'Updated public bio'])->assertOk();
        $this->assertSame('EG-1', $doctor->fresh()->license_number);
    }

    public function test_document_upload_rejects_disallowed_and_spoofed_files(): void
    {
        $doctor = DoctorProfile::factory()->create();
        $this->actingAsUser($doctor->user);

        // HTML/script renamed to .pdf: content sniffing detects text/html, not application/pdf.
        // (A PHP webshell payload would be quarantined by antivirus on dev machines.)
        $spoofed = $this->realUpload('license.pdf', "<html><body><script>alert(1)</script></body></html>\n");
        $this->post('/api/v1/doctor/documents', ['type' => 'license', 'file' => $spoofed], ['Accept' => 'application/json'])
            ->assertUnprocessable()->assertJsonValidationErrors(['file']);

        $exe = UploadedFile::fake()->create('tool.exe', 10, 'application/x-msdownload');
        $this->post('/api/v1/doctor/documents', ['type' => 'license', 'file' => $exe], ['Accept' => 'application/json'])
            ->assertUnprocessable();

        $huge = UploadedFile::fake()->create('big.pdf', 6000, 'application/pdf');
        $this->post('/api/v1/doctor/documents', ['type' => 'license', 'file' => $huge], ['Accept' => 'application/json'])
            ->assertUnprocessable();

        $this->assertSame(0, $doctor->documents()->count());
    }

    public function test_documents_are_private_and_owner_scoped(): void
    {
        $owner = DoctorProfile::factory()->create();
        $other = DoctorProfile::factory()->create();

        $id = $this->actingAsUser($owner->user)
            ->post('/api/v1/doctor/documents', ['type' => 'license', 'file' => $this->pdf('my licence.pdf')], ['Accept' => 'application/json'])
            ->assertCreated()->json('data.id');
        $doc = $owner->documents()->first();

        // Stored privately under a generated name, not the client's filename.
        Storage::disk('local')->assertExists($doc->path);
        $this->assertStringStartsWith("verification/{$owner->id}/", $doc->path);
        $this->assertStringNotContainsString('licence', $doc->path);
        Storage::disk('public')->assertMissing($doc->path);

        $this->get("/api/v1/doctor/documents/{$id}/download")->assertOk()->assertHeader('X-Content-Type-Options', 'nosniff');
        $this->actingAsUser($other->user)->get("/api/v1/doctor/documents/{$id}/download", ['Accept' => 'application/json'])->assertNotFound();
        $this->deleteJson("/api/v1/doctor/documents/{$id}")->assertNotFound();
        $this->actingAsUser(User::factory()->patient()->create())->get("/api/v1/admin/doctors/{$owner->id}/documents/{$id}/download", ['Accept' => 'application/json'])
            ->assertForbidden();
    }

    public function test_own_profile_includes_avatar_url(): void
    {
        $doctor = DoctorProfile::factory()->create();
        $this->actingAsUser($doctor->user)->getJson('/api/v1/doctor/profile', $this->apiHeaders())
            ->assertOk()->assertJsonPath('data.avatar_url', null);

        $doctor->forceFill(['avatar_path' => 'avatars/me.png'])->save();
        $this->getJson('/api/v1/doctor/profile', $this->apiHeaders())
            ->assertOk()->assertJsonPath('data.avatar_url', "/api/v1/doctors/{$doctor->id}/avatar");
    }
}
