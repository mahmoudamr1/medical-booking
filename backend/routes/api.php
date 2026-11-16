<?php

use App\Http\Controllers\Api\V1\HealthController;
use Illuminate\Support\Facades\Route;

/*
| Versioned REST API. All business endpoints live under /api/v1, one file per area in routes/api/v1/.
| Auth: Sanctum SPA cookie session (GET /sanctum/csrf-cookie first).
| Authorization is enforced here (role/permission/tenant middleware) and again in actions.
*/
// Health checks are probed by monitors and must never be rate limited.
Route::get('v1/health', HealthController::class);

Route::prefix('v1')->middleware('throttle:api')->group(function () {
    require __DIR__.'/api/v1/auth.php';
    require __DIR__.'/api/v1/public.php';

    Route::middleware(['auth:sanctum', 'active'])->group(function () {
        require __DIR__.'/api/v1/doctor.php';
        require __DIR__.'/api/v1/patient.php';
        require __DIR__.'/api/v1/urgent.php';
        require __DIR__.'/api/v1/clinic.php';
        require __DIR__.'/api/v1/admin.php';
    });
});
