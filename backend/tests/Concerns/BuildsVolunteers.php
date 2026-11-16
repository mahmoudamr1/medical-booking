<?php

namespace Tests\Concerns;

use App\Models\City;
use App\Models\DoctorProfile;
use App\Models\Governorate;
use App\Models\Specialty;
use App\Models\VolunteerAvailability;
use App\Models\VolunteerProfile;
use Database\Factories\ClinicBranchFactory;

trait BuildsVolunteers
{
    protected Governorate $cairo;

    protected City $nasrCity;

    protected City $maadi;

    protected Governorate $alex;

    protected function geography(): void
    {
        $this->cairo = ClinicBranchFactory::governorate('cairo');
        $this->nasrCity = ClinicBranchFactory::city($this->cairo->id, 'nasr-city');
        $this->maadi = ClinicBranchFactory::city($this->cairo->id, 'maadi');
        $this->alex = ClinicBranchFactory::governorate('alexandria');
    }

    /** Verified doctor, opted in, covering $city (or whole governorate when $city null), available now. */
    protected function volunteer(Specialty $specialty, ?City $city = null, ?Governorate $gov = null, array $opts = []): DoctorProfile
    {
        $doctor = DoctorProfile::factory()->verified()->withSpecialty($specialty)->create();
        $profile = VolunteerProfile::create([
            'doctor_profile_id' => $doctor->id, 'status' => $opts['status'] ?? 'active',
            'accepts_online' => $opts['online'] ?? true, 'accepts_in_person' => $opts['in_person'] ?? true,
            'max_concurrent_requests' => $opts['max'] ?? 1, 'opted_in_at' => now(),
        ]);
        $profile->specialties()->attach($specialty->id);
        $profile->locations()->create([
            'governorate_id' => ($gov ?? $this->cairo)->id, 'city_id' => $city?->id,
        ]);
        if ($opts['available'] ?? true) {
            VolunteerAvailability::create([
                'volunteer_profile_id' => $profile->id, 'starts_at' => now()->subMinute(),
                'ends_at' => now()->addHours($opts['hours'] ?? 2), 'mode' => $opts['mode'] ?? 'both', 'kind' => 'now',
            ]);
        }

        return $doctor->fresh(['user']);
    }

    protected function urgentPayload(array $overrides = []): array
    {
        return array_merge([
            'severity' => 'urgent', 'consent' => true,
            'description' => 'High fever since yesterday evening, need advice.',
            'consultation_type' => 'online', 'governorate_id' => $this->cairo->id, 'city_id' => $this->nasrCity->id,
            'contact_phone' => '01012345678',
        ], $overrides);
    }
}
