<?php

namespace Tests\Feature\Security;

use App\Models\User;
use Illuminate\Routing\Route;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

/**
 * Policy-as-test for the route table: a new endpoint that forgets its guard fails here.
 * Only the routes listed in PUBLIC may be reached by guests.
 */
class RouteGuardTest extends SecurityTestCase
{
    /** Every guest-reachable /api/v1 route ("METHOD uri"). Adding one is a deliberate, reviewed decision. */
    private const PUBLIC = [
        'GET api/v1/health',
        'POST api/v1/auth/register', 'POST api/v1/auth/login',
        'POST api/v1/auth/forgot-password', 'POST api/v1/auth/reset-password',
        'GET api/v1/auth/verify-email/{id}/{hash}',
        'GET api/v1/home', 'GET api/v1/settings/public',
        'GET api/v1/specialties', 'GET api/v1/specialties/{slug}',
        'GET api/v1/locations/governorates', 'GET api/v1/locations/governorates/{governorate}/cities',
        'GET api/v1/locations/cities/{city}/areas',
        'GET api/v1/doctors', 'GET api/v1/doctors/{doctor}', 'GET api/v1/doctors/{doctor}/services',
        'GET api/v1/doctors/{doctor}/reviews', 'GET api/v1/doctors/{doctor}/availability', 'GET api/v1/doctors/{doctor}/avatar',
        'GET api/v1/clinics', 'GET api/v1/clinics/{slug}', 'GET api/v1/clinics/{slug}/logo',
        'GET api/v1/urgent/available-doctors',
    ];

    /** Abuse-prone endpoints and the dedicated limiter each must keep. */
    private const THROTTLED = [
        'POST api/v1/auth/register' => 'throttle:register',
        'POST api/v1/auth/login' => 'throttle:login',
        'POST api/v1/auth/forgot-password' => 'throttle:password-reset',
        'POST api/v1/auth/reset-password' => 'throttle:password-reset',
        'POST api/v1/auth/email/verification-notification' => 'throttle:6,1',
        'POST api/v1/appointments' => 'throttle:20,1',
        'POST api/v1/reviews/{review}/report' => 'throttle:10,1',
        'POST api/v1/doctor/documents' => 'throttle:20,1',
        'POST api/v1/urgent-requests' => 'throttle:urgent',
        'POST api/v1/urgent-requests/{urgentRequest}/messages' => 'throttle:30,1',
    ];

    /** @return Collection<string, Route> keyed by "METHOD uri" */
    private function apiRoutes(): Collection
    {
        return collect($this->app['router']->getRoutes()->getRoutes())
            ->filter(fn (Route $r) => str_starts_with($r->uri(), 'api/v1/'))
            ->keyBy(fn (Route $r) => $r->methods()[0].' '.$r->uri());
    }

    /** @return Collection<string, Route> */
    private function protectedRoutes(): Collection
    {
        return $this->apiRoutes()->except(self::PUBLIC);
    }

    /** A concrete URL for the route: constrained parameters get their first allowed value, ids an unknown ULID. */
    private function urlFor(Route $route): string
    {
        return '/'.preg_replace_callback('/\{(\w+)\??\}/', function (array $m) use ($route) {
            $pattern = $route->wheres[$m[1]] ?? null;

            return $pattern !== null && str_contains($pattern, '|') ? Str::before($pattern, '|') : self::UNKNOWN_ID;
        }, $route->uri());
    }

    public function test_public_allowlist_matches_real_routes_and_only_auth_endpoints_accept_guest_writes(): void
    {
        $routes = $this->apiRoutes();
        $this->assertSame([], array_values(array_diff(self::PUBLIC, $routes->keys()->all())), 'Stale entries in PUBLIC.');

        $guestWrites = collect(self::PUBLIC)->reject(fn (string $key) => str_starts_with($key, 'GET '))->values()->all();
        $this->assertSame(['POST api/v1/auth/register', 'POST api/v1/auth/login',
            'POST api/v1/auth/forgot-password', 'POST api/v1/auth/reset-password'], $guestWrites);
        $this->assertContains('signed', $routes['GET api/v1/auth/verify-email/{id}/{hash}']->gatherMiddleware());
    }

    public function test_every_non_public_route_requires_an_authenticated_active_account(): void
    {
        $protected = $this->protectedRoutes();
        $this->assertGreaterThan(90, $protected->count());

        foreach ($protected as $key => $route) {
            $middleware = $route->gatherMiddleware();
            $this->assertContains('auth:sanctum', $middleware, "{$key} is missing auth:sanctum");
            $this->assertContains('active', $middleware, "{$key} is missing the active-account check");
        }
    }

    public function test_area_routes_carry_their_role_permission_or_tenant_guard(): void
    {
        foreach ($this->protectedRoutes() as $key => $route) {
            $middleware = collect($route->gatherMiddleware());
            $uri = $route->uri();

            if (str_starts_with($uri, 'api/v1/admin/')) {
                $permissions = $middleware->filter(fn (string $m) => str_starts_with($m, 'permission:'))->values();
                $this->assertSame('permission:admin.access', $permissions->first(), "{$key} is missing admin.access");
                $this->assertCount(2, $permissions, "{$key} needs its own admin permission besides admin.access");
            }
            if (str_starts_with($uri, 'api/v1/doctor/')) {
                $this->assertContains('role:doctor', $middleware->all(), "{$key} is missing role:doctor");
            }
            if (str_starts_with($uri, 'api/v1/clinics/{clinic}/')) {
                $tenant = $middleware->first(fn (string $m) => str_starts_with($m, 'tenant'));
                $this->assertNotNull($tenant, "{$key} is missing the tenant boundary");
                if ($route->methods()[0] !== 'GET') {
                    $this->assertStringStartsWith('tenant:clinic.', $tenant, "{$key} changes clinic data without a clinic permission");
                }
            }
        }
    }

    public function test_abuse_prone_endpoints_keep_their_rate_limits(): void
    {
        $routes = $this->apiRoutes();
        foreach (self::THROTTLED as $key => $limiter) {
            $this->assertContains($limiter, $routes[$key]->gatherMiddleware(), "{$key} lost {$limiter}");
        }
        foreach ($routes->except(['GET api/v1/health']) as $key => $route) {
            $this->assertContains('throttle:api', $route->gatherMiddleware(), "{$key} is outside the global API limit");
        }
    }

    public function test_guests_get_401_from_every_non_public_route(): void
    {
        foreach ($this->protectedRoutes() as $key => $route) {
            $response = $this->json($route->methods()[0], $this->urlFor($route), [], $this->apiHeaders());
            $this->assertSame(401, $response->status(), "{$key} answered a guest with {$response->status()}");
        }
    }

    public function test_suspended_accounts_are_refused_by_every_non_public_route(): void
    {
        $suspended = User::factory()->suspended()->create();

        foreach ($this->protectedRoutes() as $key => $route) {
            // Re-authenticate each time: the first refusal logs the session out.
            $response = $this->actingAsUser($suspended)->json($route->methods()[0], $this->urlFor($route), [], $this->apiHeaders());
            // Unknown ids of model-bound routes resolve to 404 before the account check; neither discloses data.
            $this->assertContains($response->status(), [403, 404], "{$key} served a suspended account ({$response->status()})");
            if ($response->status() === 403) {
                $this->assertSame('account_suspended', $response->json('code'), $key);
            }
        }
    }
}
