<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Usage: ->middleware('role:doctor') or 'role:admin,doctor' (any of). */
class EnsureRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();
        if (! $user || ! collect($roles)->contains(fn (string $r) => $user->hasRole($r))) {
            throw new AuthorizationException;
        }

        return $next($request);
    }
}
