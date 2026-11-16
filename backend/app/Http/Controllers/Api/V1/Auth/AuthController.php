<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Actions\Auth\RegisterUser;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Requests\Auth\UpdateAccountRequest;
use App\Http\Requests\Auth\UpdatePasswordRequest;
use App\Http\Resources\CurrentUserResource;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(RegisterRequest $request, RegisterUser $register): JsonResponse
    {
        $user = $register->handle($request->validated(), $request->ip());

        Auth::guard('web')->login($user);
        $request->session()->regenerate();

        return ApiResponse::created(new CurrentUserResource($user), __('api.auth.registered'));
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $credentials = ['email' => mb_strtolower($request->string('email')), 'password' => $request->string('password')];

        // Demo accounts are development-only: never usable in production even if the rows exist.
        if (app()->isProduction() && str_ends_with($credentials['email'], '@example.test')) {
            throw ValidationException::withMessages(['email' => [__('api.auth.invalid_credentials')]]);
        }

        if (! Auth::guard('web')->attempt($credentials, $request->boolean('remember'))) {
            throw ValidationException::withMessages(['email' => [__('api.auth.invalid_credentials')]]);
        }

        $user = Auth::guard('web')->user();
        if (! $user instanceof User || ! $user->isActive()) {
            Auth::guard('web')->logout();

            return ApiResponse::error(__('api.account_suspended'), 403, null, 'account_suspended');
        }

        $request->session()->regenerate();
        $user->forceFill(['last_login_at' => now()])->save();

        return ApiResponse::ok(new CurrentUserResource($user), __('api.auth.logged_in'));
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return ApiResponse::ok(null, __('api.auth.logged_out'));
    }

    public function me(Request $request): JsonResponse
    {
        return ApiResponse::ok(new CurrentUserResource($request->user()));
    }

    public function updateMe(UpdateAccountRequest $request): JsonResponse
    {
        $user = $request->user();
        $user->update($request->validated());

        return ApiResponse::ok(new CurrentUserResource($user->fresh()), __('api.auth.profile_updated'));
    }

    public function updatePassword(UpdatePasswordRequest $request): JsonResponse
    {
        $user = $request->user();
        $user->update(['password' => $request->string('password')]);
        // Invalidate other sessions for this user.
        Auth::guard('web')->logoutOtherDevices((string) $request->string('password'));
        $request->session()->regenerate();

        return ApiResponse::ok(null, __('api.auth.password_updated'));
    }
}
