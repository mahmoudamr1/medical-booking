<?php

use App\Http\Controllers\Api\V1\Doctor\CalendarController;
use App\Http\Controllers\Api\V1\Doctor\DocumentController;
use App\Http\Controllers\Api\V1\Doctor\ProfileController as DoctorProfileController;
use App\Http\Controllers\Api\V1\Doctor\ScheduleController;
use App\Http\Controllers\Api\V1\Doctor\VolunteerController;
use App\Http\Controllers\Api\V1\UrgentRequestController;
use Illuminate\Support\Facades\Route;

/* /api/v1/doctor/* — the signed-in doctor's own profile, schedule, calendar and volunteer settings. */
Route::prefix('doctor')->middleware('role:doctor')->group(function () {
    Route::get('profile', [DoctorProfileController::class, 'show']);
    Route::put('profile', [DoctorProfileController::class, 'update']);
    Route::put('specialties', [DoctorProfileController::class, 'specialties']);
    Route::post('avatar', [DoctorProfileController::class, 'avatar']);
    Route::post('verification/submit', [DoctorProfileController::class, 'submitVerification']);
    Route::get('documents', [DocumentController::class, 'index']);
    Route::post('documents', [DocumentController::class, 'store'])->middleware('throttle:20,1');
    Route::get('documents/{document}/download', [DocumentController::class, 'download']);
    Route::delete('documents/{document}', [DocumentController::class, 'destroy']);

    Route::get('schedules', [ScheduleController::class, 'schedules']);
    Route::put('schedules', [ScheduleController::class, 'replaceSchedules']);
    Route::get('exceptions', [ScheduleController::class, 'exceptions']);
    Route::post('exceptions', [ScheduleController::class, 'storeException']);
    Route::delete('exceptions/{exception}', [ScheduleController::class, 'destroyException']);
    Route::get('preferences', [ScheduleController::class, 'preferences']);
    Route::put('preferences', [ScheduleController::class, 'updatePreferences']);
    Route::get('services', [ScheduleController::class, 'services']);
    Route::post('services', [ScheduleController::class, 'storeService']);
    Route::put('services/{service}', [ScheduleController::class, 'updateService']);
    Route::delete('services/{service}', [ScheduleController::class, 'destroyService']);

    Route::get('dashboard', [CalendarController::class, 'dashboard']);
    Route::get('appointments', [CalendarController::class, 'appointments']);
    Route::get('branches', [CalendarController::class, 'branches']);
    Route::post('practice', [CalendarController::class, 'createPractice']);

    Route::get('volunteer', [VolunteerController::class, 'show']);
    Route::put('volunteer', [VolunteerController::class, 'update']);
    Route::post('volunteer/availability', [VolunteerController::class, 'addAvailability']);
    Route::delete('volunteer/availability', [VolunteerController::class, 'clearAvailability']);
    Route::get('urgent-requests', [UrgentRequestController::class, 'doctorIndex']);
});
