<?php

use App\Exceptions\BusinessRuleException;
use App\Http\Middleware\EnsureActiveUser;
use App\Http\Middleware\EnsurePermission;
use App\Http\Middleware\EnsureRole;
use App\Http\Middleware\ResolveClinicTenant;
use App\Http\Middleware\SetLocale;
use App\Support\ApiResponse;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Sanctum first-party SPA cookie authentication for /api routes.
        $middleware->statefulApi();
        $middleware->api(prepend: [SetLocale::class]);
        $middleware->alias([
            'role' => EnsureRole::class,
            'permission' => EnsurePermission::class,
            'active' => EnsureActiveUser::class,
            'tenant' => ResolveClinicTenant::class,
        ]);
        // API never redirects unauthenticated users to a login page.
        $middleware->redirectGuestsTo(fn () => null);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        $exceptions->render(function (Throwable $e, Request $request) {
            if (! ($request->is('api/*') || $request->expectsJson())) {
                return null;
            }

            return match (true) {
                $e instanceof BusinessRuleException => ApiResponse::error($e->getMessage(), $e->status, $e->errors, $e->errorCode, $e->extra),
                $e instanceof ValidationException => ApiResponse::error(__('api.validation_failed'), 422, $e->errors(), 'validation_failed'),
                $e instanceof AuthenticationException => ApiResponse::error(__('api.unauthenticated'), 401, null, 'unauthenticated'),
                $e instanceof AuthorizationException, $e instanceof AccessDeniedHttpException => ApiResponse::error(__('api.forbidden'), 403, null, 'forbidden'),
                $e instanceof ModelNotFoundException, $e instanceof NotFoundHttpException => ApiResponse::error(__('api.not_found'), 404, null, 'not_found'),
                $e instanceof ThrottleRequestsException => ApiResponse::error(__('api.too_many_requests'), 429, null, 'rate_limited'),
                $e instanceof HttpExceptionInterface => ApiResponse::error(
                    $e->getStatusCode() === 419 ? __('api.csrf_mismatch') : ($e->getMessage() ?: __('api.error')),
                    $e->getStatusCode(), null, $e->getStatusCode() === 419 ? 'csrf_mismatch' : 'http_error'),
                // Unexpected: never leak internals. Laravel still reports/logs it.
                default => config('app.debug')
                    ? null
                    : ApiResponse::error(__('api.server_error'), 500, null, 'server_error'),
            };
        });
    })->create();
