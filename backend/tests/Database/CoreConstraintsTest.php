<?php

namespace Tests\Database;

use App\Models\Clinic;
use App\Models\ClinicBranch;
use App\Models\DoctorProfile;
use App\Models\MedicalService;
use App\Models\Specialty;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

/** The database itself must reject invalid data, independent of application validation. */
class CoreConstraintsTest extends TestCase
{
    private function assertRejected(callable $write, string $sqlState = '23'): void
    {
        try {
            DB::transaction(fn () => $write());
            $this->fail('Expected the database to reject the write.');
        } catch (QueryException $e) {
            $this->assertStringStartsWith($sqlState, (string) $e->getCode(), $e->getMessage());
        }
    }

    public function test_user_email_and_phone_are_unique(): void
    {
        User::factory()->create(['email' => 'a@example.test', 'phone' => '01000000001']);
        $this->assertRejected(fn () => User::factory()->create(['email' => 'a@example.test']));
        $this->assertRejected(fn () => User::factory()->create(['phone' => '01000000001']));
        // Multiple users without phone are fine (partial unique index).
        User::factory()->count(2)->create(['phone' => null]);
        $this->assertSame(3, User::count());
    }

    public function test_enum_check_constraints(): void
    {
        $user = User::factory()->create();
        $this->assertRejected(fn () => DB::table('users')->where('id', $user->id)->update(['status' => 'deleted']));
        $doctor = DoctorProfile::factory()->create();
        $this->assertRejected(fn () => DB::table('doctor_profiles')->where('id', $doctor->id)->update(['verification_status' => 'auto_approved']));
    }

    public function test_one_doctor_profile_per_user(): void
    {
        $doctor = DoctorProfile::factory()->create();
        $this->assertRejected(fn () => DoctorProfile::factory()->create(['user_id' => $doctor->user_id]));
    }

    public function test_service_price_and_duration_bounds(): void
    {
        $doctor = DoctorProfile::factory()->create();
        $this->assertRejected(fn () => MedicalService::factory()->create(['doctor_profile_id' => $doctor->id, 'price' => -1]));
        $this->assertRejected(fn () => MedicalService::factory()->create(['doctor_profile_id' => $doctor->id, 'duration_minutes' => 0]));
    }

    public function test_in_person_service_requires_branch_and_branch_requires_clinic(): void
    {
        $doctor = DoctorProfile::factory()->create();
        $this->assertRejected(fn () => MedicalService::factory()->create([
            'doctor_profile_id' => $doctor->id, 'consultation_type' => 'in_person',
        ]));
        $branch = ClinicBranch::factory()->create();
        $this->assertRejected(fn () => MedicalService::factory()->create([
            'doctor_profile_id' => $doctor->id, 'consultation_type' => 'in_person', 'clinic_branch_id' => $branch->id,
        ]));
        MedicalService::factory()->create([
            'doctor_profile_id' => $doctor->id, 'consultation_type' => 'in_person',
            'clinic_branch_id' => $branch->id, 'clinic_id' => $branch->clinic_id,
        ]);
        $this->assertSame(1, MedicalService::count());
    }

    public function test_foreign_keys_are_enforced(): void
    {
        $this->assertRejected(fn () => DB::table('doctor_specialties')->insert([
            'doctor_profile_id' => '01jxxxxxxxxxxxxxxxxxxxxxxx', 'specialty_id' => '01jxxxxxxxxxxxxxxxxxxxxxxx',
        ]));
    }

    public function test_doctor_has_at_most_one_primary_specialty(): void
    {
        $doctor = DoctorProfile::factory()->create();
        [$a, $b] = Specialty::factory()->count(2)->create();
        $doctor->specialties()->attach($a->id, ['is_primary' => true]);
        $this->assertRejected(fn () => $doctor->specialties()->attach($b->id, ['is_primary' => true]));
    }

    public function test_specialty_in_use_cannot_be_deleted(): void
    {
        $doctor = DoctorProfile::factory()->withSpecialty()->create();
        $this->assertRejected(fn () => $doctor->specialties()->first()->delete());
    }

    public function test_membership_is_unique_per_clinic_and_user(): void
    {
        $clinic = Clinic::factory()->create();
        $this->assertRejected(fn () => DB::table('clinic_memberships')->insert([
            'id' => (string) Str::ulid(), 'clinic_id' => $clinic->id, 'user_id' => $clinic->owner_user_id,
            'role' => 'manager', 'status' => 'active',
        ]));
    }

    public function test_branch_hours_period_must_be_valid(): void
    {
        $branch = ClinicBranch::factory()->create();
        $this->assertRejected(fn () => DB::table('branch_hours')->insert([
            'clinic_branch_id' => $branch->id, 'day_of_week' => 1, 'opens_at' => '18:00', 'closes_at' => '09:00',
        ]));
        $this->assertRejected(fn () => DB::table('branch_hours')->insert([
            'clinic_branch_id' => $branch->id, 'day_of_week' => 9, 'opens_at' => '09:00', 'closes_at' => '17:00',
        ]));
    }

    public function test_transaction_rollback_leaves_no_partial_data(): void
    {
        try {
            DB::transaction(function () {
                User::factory()->create(['email' => 'rollback@example.test']);
                DB::table('users')->insert(['id' => 'bad', 'name' => 'x', 'email' => 'rollback@example.test', 'password' => 'x']);
            });
        } catch (QueryException) {
        }
        $this->assertDatabaseMissing('users', ['email' => 'rollback@example.test']);
    }
}
