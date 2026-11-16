<?php

namespace Tests\Feature\Security;

use App\Enums\ClinicRole;
use App\Models\Clinic;
use App\Models\ClinicMembership;
use App\Models\DoctorProfile;
use App\Models\MedicalService;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Tests\Concerns\BuildsSchedules;
use Tests\TestCase;

/** Shared fixtures for the attack-style tests of the security audit (T100). */
abstract class SecurityTestCase extends TestCase
{
    use BuildsSchedules;

    protected const NOW = '2026-11-16 08:00:00'; // Mon 10:00 Cairo

    protected const UNKNOWN_ID = '01jzzzzzzzzzzzzzzzzzzzzzzz';

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(CarbonImmutable::parse(self::NOW, 'UTC'));
        Notification::fake();
        Storage::fake('local');
        Storage::fake('public');
    }

    protected function member(Clinic $clinic, ClinicRole $role, string $status = 'active'): User
    {
        $user = User::factory()->create();
        ClinicMembership::create(['clinic_id' => $clinic->id, 'user_id' => $user->id, 'role' => $role, 'status' => $status]);

        return $user;
    }

    protected function doctorUser(bool $verified = true): User
    {
        $factory = DoctorProfile::factory()->withSpecialty();

        return ($verified ? $factory->verified() : $factory)->create()->user;
    }

    /** Books and completes a visit as the doctor; time is restored afterwards. Returns [appointmentId, patient]. */
    protected function completedVisit(DoctorProfile $doctor, MedicalService $service, string $at = '2026-11-16 11:00'): array
    {
        $patient = $this->patientUser();
        $id = $this->book($patient, $doctor, $service, $at)->assertCreated()->json('data.id');
        $this->travelTo(CarbonImmutable::parse($at, 'Africa/Cairo')->addMinutes(30));
        $this->actingAsUser($doctor->user)->postJson("/api/v1/appointments/{$id}/complete", [], $this->apiHeaders())->assertOk();
        $this->travelTo(CarbonImmutable::parse(self::NOW, 'UTC'));

        return [$id, $patient];
    }

    /** A real temp file, so MIME detection sniffs the content (UploadedFile::fake() trusts the extension). */
    protected function realUpload(string $name, string $content): UploadedFile
    {
        $path = tempnam(sys_get_temp_dir(), 'sec');
        file_put_contents($path, $content);

        return new UploadedFile($path, $name, null, null, true);
    }

    protected function pdf(string $name = 'license.pdf'): UploadedFile
    {
        return $this->realUpload($name, "%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");
    }
}
