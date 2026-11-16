<?php

use App\Http\Controllers\Api\V1\Admin\DoctorVerificationController;
use App\Http\Controllers\Api\V1\Admin\ModerationController;
use App\Http\Controllers\Api\V1\Admin\OversightController;
use App\Http\Controllers\Api\V1\Admin\PlatformController;
use App\Http\Controllers\Api\V1\Admin\SpecialtyController as AdminSpecialtyController;
use App\Http\Controllers\Api\V1\Admin\StatsController;
use App\Http\Controllers\Api\V1\Admin\UrgentLiveController;
use App\Http\Controllers\Api\V1\Admin\UserController as AdminUserController;
use Illuminate\Support\Facades\Route;

/* /api/v1/admin/* — platform administration; each block requires its own permission. */
Route::prefix('admin')->middleware('permission:admin.access')->group(function () {
    Route::middleware('permission:doctors.verify')->group(function () {
        Route::get('doctors', [DoctorVerificationController::class, 'index']);
        Route::get('doctors/{doctor}', [DoctorVerificationController::class, 'show']);
        Route::post('doctors/{doctor}/{decision}', [DoctorVerificationController::class, 'decide'])
            ->where('decision', 'approve|reject|suspend|reinstate');
        Route::get('doctors/{doctor}/documents/{document}/download', [DoctorVerificationController::class, 'document']);
    });
    Route::middleware('permission:reports.view')->group(function () {
        Route::get('stats', [StatsController::class, 'overview']);
        Route::get('reports/appointments', [StatsController::class, 'appointments']);
    });
    Route::middleware('permission:users.manage')->group(function () {
        Route::get('users', [AdminUserController::class, 'index']);
        Route::put('users/{user}/status', [AdminUserController::class, 'status']);
    });
    Route::middleware('permission:clinics.manage')->group(function () {
        Route::get('clinics', [OversightController::class, 'clinics']);
        Route::put('clinics/{clinic}/status', [OversightController::class, 'clinicStatus']);
    });
    Route::middleware('permission:appointments.oversee')->group(function () {
        Route::get('appointments', [OversightController::class, 'appointments']);
        Route::post('appointments/{appointment}/cancel', [OversightController::class, 'cancelAppointment']);
    });
    Route::middleware('permission:urgent.oversee')->group(function () {
        Route::get('urgent/live', UrgentLiveController::class);
        Route::get('urgent-requests', [OversightController::class, 'urgentRequests']);
        Route::get('urgent-requests/{urgentRequest}', [OversightController::class, 'urgentRequest']);
    });
    Route::middleware('permission:reviews.moderate')->group(function () {
        Route::get('reviews', [ModerationController::class, 'reviews']);
        Route::post('reviews/{review}/{action}', [ModerationController::class, 'moderate'])->where('action', 'hide|restore');
        Route::get('review-reports', [ModerationController::class, 'reports']);
        Route::post('review-reports/{report}/{decision}', [ModerationController::class, 'resolveReport'])->where('decision', 'resolve|dismiss');
    });
    Route::get('audit-logs', [PlatformController::class, 'auditLogs'])->middleware('permission:audit.view');
    Route::middleware('permission:settings.manage')->group(function () {
        Route::get('settings', [PlatformController::class, 'settings']);
        Route::put('settings', [PlatformController::class, 'updateSettings']);
    });
    Route::middleware('permission:specialties.manage')->group(function () {
        Route::get('specialties', [AdminSpecialtyController::class, 'index']);
        Route::post('specialties', [AdminSpecialtyController::class, 'store']);
        Route::put('specialties/{specialty}', [AdminSpecialtyController::class, 'update']);
        Route::delete('specialties/{specialty}', [AdminSpecialtyController::class, 'destroy']);
    });
});
