<?php

namespace Tests\Feature\Directory;

use App\Services\Scheduling\AvailabilityService;
use Carbon\CarbonImmutable;
use Database\Seeders\GeographySeeder;
use Illuminate\Support\Facades\Cache;
use Tests\Concerns\BuildsSchedules;
use Tests\TestCase;

/**
 * Regression: cached public payloads must survive serialization (production uses Redis).
 * The array cache used elsewhere in tests never serializes, which hid a broken response shape.
 */
class PublicCacheTest extends TestCase
{
    use BuildsSchedules;

    protected function setUp(): void
    {
        parent::setUp();
        config(['cache.default' => 'file']);
        Cache::store('file')->flush();
    }

    protected function tearDown(): void
    {
        Cache::store('file')->flush();
        parent::tearDown();
    }

    public function test_cached_responses_are_identical_to_fresh_ones(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-11-16 08:00:00', 'UTC'));
        [$doctor] = $this->bookableDoctor();
        app(AvailabilityService::class)->refreshNextAvailable($doctor);
        $this->seed(GeographySeeder::class);

        foreach (['/api/v1/home', '/api/v1/specialties', '/api/v1/locations/governorates'] as $url) {
            $fresh = $this->getJson($url)->assertOk()->json();
            $cached = $this->getJson($url)->assertOk();
            $this->assertSame($fresh, $cached->json(), "$url changed shape when served from cache");
            $this->assertStringNotContainsString('__PHP_Incomplete_Class', $cached->getContent());
        }

        $card = $this->getJson('/api/v1/home')->json('data.recommended_doctors.0');
        $this->assertIsList($card['specialties']);
        $this->assertSame($doctor->specialties()->first()->id, $card['specialties'][0]['id']);
    }
}
