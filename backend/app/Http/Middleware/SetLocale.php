<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Picks ar|en from Accept-Language (or X-Locale), defaulting to Arabic. */
class SetLocale
{
    public function handle(Request $request, Closure $next): Response
    {
        $requested = $request->header('X-Locale') ?: $request->getPreferredLanguage(['ar', 'en']);
        app()->setLocale(in_array($requested, ['ar', 'en'], true) ? $requested : config('app.locale', 'ar'));

        return $next($request);
    }
}
