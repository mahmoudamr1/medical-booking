<?php

namespace Tests\Feature\Directory;

use App\Enums\ConsultationType;
use App\Models\ClinicBranch;
use App\Models\DoctorBranchAffiliation;
use App\Models\DoctorProfile;
use App\Models\MedicalService;
use App\Models\Specialty;
use App\Models\User;
use Database\Factories\ClinicBranchFactory;
use Database\Seeders\GeographySeeder;
use Database\Seeders\SpecialtySeeder;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class PublicDirectoryTest extends TestCase
{
    private function doctorAt(ClinicBranch $branch, array $attrs = [], ?Specialty $specialty = null, float $price = 300, bool $verified = true): DoctorProfile
    {
        $factory = DoctorProfile::factory()->withSpecialty($specialty);
        $doctor = ($verified ? $factory->verified() : $factory)->create($attrs);
        DoctorBranchAffiliation::create([
            'doctor_profile_id' => $doctor->id, 'clinic_branch_id' => $branch->id, 'clinic_id' => $branch->clinic_id,
        ]);
        MedicalService::factory()->create([
            'doctor_profile_id' => $doctor->id, 'clinic_branch_id' => $branch->id, 'clinic_id' => $branch->clinic_id,
            'consultation_type' => ConsultationType::InPerson, 'price' => $price,
        ]);
        $doctor->forceFill(['min_price' => $price])->save();

        return $doctor->fresh();
    }

    public function test_only_verified_active_doctors_are_public(): void
    {
        $branch = ClinicBranch::factory()->create();
        $visible = $this->doctorAt($branch);
        $unverified = $this->doctorAt($branch, verified: false);
        $pending = DoctorProfile::factory()->pending()->create();
        $inactive = $this->doctorAt($branch);
        $inactive->forceFill(['is_active' => false])->save();
        $suspendedUser = $this->doctorAt($branch);
        $suspendedUser->user->forceFill(['status' => 'suspended'])->save();

        $ids = collect($this->getJson('/api/v1/doctors')->assertOk()->json('data'))->pluck('id');
        $this->assertEquals([$visible->id], $ids->all());

        foreach ([$unverified, $pending, $inactive, $suspendedUser] as $hidden) {
            $this->getJson("/api/v1/doctors/{$hidden->id}")->assertNotFound();
        }
        $this->getJson("/api/v1/doctors/{$visible->id}")->assertOk();
    }

    public function test_public_profile_never_exposes_private_verification_data(): void
    {
        $doctor = $this->doctorAt(ClinicBranch::factory()->create());
        $doctor->forceFill(['license_number' => 'SECRET-LIC-123', 'verification_notes' => 'internal note'])->save();
        $doctor->documents()->create(['type' => 'license', 'disk' => 'local', 'path' => 'verification/x.pdf',
            'original_name' => 'license-scan.pdf', 'mime' => 'application/pdf', 'size' => 10]);

        foreach (["/api/v1/doctors/{$doctor->id}", '/api/v1/doctors'] as $url) {
            $body = $this->getJson($url)->assertOk()->getContent();
            foreach (['SECRET-LIC-123', 'internal note', 'license-scan.pdf', 'verification/', $doctor->user->email, 'license_number'] as $secret) {
                $this->assertStringNotContainsString($secret, $body, "$url leaked $secret");
            }
        }
    }

    public function test_search_filters_are_applied_server_side(): void
    {
        $cardio = Specialty::factory()->create(['slug' => 'cardio']);
        $derm = Specialty::factory()->create(['slug' => 'derm']);
        $cairo = ClinicBranch::factory()->create();
        $alexGov = ClinicBranchFactory::governorate('alexandria');
        $alex = ClinicBranch::factory()->create([
            'governorate_id' => $alexGov->id, 'city_id' => ClinicBranchFactory::city($alexGov->id, 'smouha')->id,
        ]);

        $a = $this->doctorAt($cairo, ['years_experience' => 10], $cardio, 500);
        $a->user->update(['name' => 'د. أحمد سامي']);
        $a->save(); // refresh search_text
        $b = $this->doctorAt($alex, [], $cardio, 200);
        $c = $this->doctorAt($cairo, [], $derm, 250);
        $c->forceFill(['rating_avg' => 4.8, 'rating_count' => 10])->save();

        $ids = fn (string $qs) => collect($this->getJson('/api/v1/doctors?'.$qs)->assertOk()->json('data'))->pluck('id')->sort()->values()->all();

        $this->assertEqualsCanonicalizing([$a->id, $b->id], $ids('specialty=cardio'));
        $this->assertEqualsCanonicalizing([$b->id], $ids('governorate='.$alexGov->id));
        $this->assertEqualsCanonicalizing([$b->id, $c->id], $ids('max_price=300'));
        $this->assertEqualsCanonicalizing([$a->id], $ids('min_price=400'));
        $this->assertEqualsCanonicalizing([$c->id], $ids('min_rating=4.5'));
        $this->assertEqualsCanonicalizing([$a->id, $b->id, $c->id], $ids('consultation_type=in_person'));
        $this->assertEqualsCanonicalizing([], $ids('consultation_type=online'));
        $this->assertEqualsCanonicalizing([$a->id], $ids('specialty=cardio&min_price=300&governorate='.$cairo->governorate_id));
        // Arabic normalization: "احمد" (no hamza) matches "أحمد".
        $this->assertEqualsCanonicalizing([$a->id], $ids('q='.urlencode('احمد')));
        $this->assertEqualsCanonicalizing([$a->id], $ids('q='.urlencode('أحمد سامي')));
        // Clinic filter by slug.
        $this->assertEqualsCanonicalizing([$b->id], $ids('clinic='.$alex->clinic->slug));
    }

    public function test_search_is_paginated_and_sorted(): void
    {
        $branch = ClinicBranch::factory()->create();
        foreach ([300, 100, 200] as $price) {
            $this->doctorAt($branch, [], null, $price);
        }

        $res = $this->getJson('/api/v1/doctors?per_page=2&sort=price_asc')->assertOk();
        $res->assertJsonPath('meta.pagination.total', 3)->assertJsonPath('meta.pagination.last_page', 2);
        $this->assertSame([100.0, 200.0], array_map('floatval', array_column($res->json('data'), 'min_price')));
        $this->getJson('/api/v1/doctors?per_page=2&page=2&sort=price_asc')->assertJsonPath('data.0.min_price', 300);
    }

    public function test_search_validates_parameters(): void
    {
        $this->getJson('/api/v1/doctors?min_price=-5&sort=hacked&governorate=x')
            ->assertUnprocessable()->assertJsonValidationErrors(['min_price', 'sort', 'governorate']);
    }

    public function test_specialties_and_locations_are_public(): void
    {
        $this->seed(SpecialtySeeder::class);
        $this->seed(GeographySeeder::class);
        Specialty::where('slug', 'urology')->update(['is_active' => false]);
        Cache::flush();

        $slugs = collect($this->getJson('/api/v1/specialties')->assertOk()->json('data'))->pluck('slug');
        $this->assertCount(13, $slugs);
        $this->assertNotContains('urology', $slugs);
        $this->getJson('/api/v1/specialties/urology')->assertNotFound();

        $gov = collect($this->getJson('/api/v1/locations/governorates')->assertOk()->json('data'))->firstWhere('slug', 'cairo');
        $this->getJson("/api/v1/locations/governorates/{$gov['id']}/cities")->assertOk()->assertJsonFragment(['slug' => 'nasr-city']);
    }

    public function test_clinic_directory_lists_active_clinics_with_public_doctors_only(): void
    {
        $branch = ClinicBranch::factory()->create();
        $visible = $this->doctorAt($branch);
        $hidden = $this->doctorAt($branch, verified: false);

        $this->getJson('/api/v1/clinics')->assertOk()->assertJsonPath('data.0.slug', $branch->clinic->slug)
            ->assertJsonPath('data.0.doctors_count', 1);

        $detail = $this->getJson('/api/v1/clinics/'.$branch->clinic->slug)->assertOk();
        $this->assertEquals([$visible->id], array_column($detail->json('data.doctors'), 'id'));
        $this->assertCount(1, $detail->json('data.services'));
        $this->assertStringNotContainsString($hidden->id, $detail->getContent());

        $branch->clinic->forceFill(['status' => 'suspended'])->save();
        $this->getJson('/api/v1/clinics/'.$branch->clinic->slug)->assertNotFound();
    }

    public function test_guest_cannot_access_doctor_or_admin_endpoints(): void
    {
        $this->getJson('/api/v1/doctor/profile')->assertUnauthorized();
        $this->getJson('/api/v1/admin/doctors')->assertUnauthorized();
        $patient = User::factory()->patient()->create();
        $this->actingAsUser($patient)->getJson('/api/v1/doctor/profile')->assertForbidden();
        $this->actingAsUser($patient)->getJson('/api/v1/admin/doctors')->assertForbidden();
    }
}
