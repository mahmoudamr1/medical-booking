<?php

namespace App\Http\Requests\Concerns;

/**
 * Session endpoints (login, register) only work for the first-party SPA: Sanctum starts a session
 * solely for its stateful origins. Any other caller gets 403 before credentials are checked or
 * anything is written, instead of failing halfway with a server error.
 */
trait RequiresSpaSession
{
    public function authorize(): bool
    {
        return $this->hasSession();
    }
}
