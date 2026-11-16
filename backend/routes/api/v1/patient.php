<?php

use App\Http\Controllers\Api\V1\AppointmentController;
use App\Http\Controllers\Api\V1\NotificationController;
use App\Http\Controllers\Api\V1\PatientController;
use App\Http\Controllers\Api\V1\ReviewController;
use Illuminate\Support\Facades\Route;

/* Patient profile, consents, notifications, appointments (booking + shared actions) and reviews. */
Route::get('patient/profile', [PatientController::class, 'profile']);
Route::put('patient/profile', [PatientController::class, 'updateProfile']);
Route::get('consents', [PatientController::class, 'consents']);
Route::put('consents/{type}', [PatientController::class, 'updateConsent']);
Route::get('notifications', [NotificationController::class, 'index']);
Route::get('notifications/unread-count', [NotificationController::class, 'unreadCount']);
Route::post('notifications/read-all', [NotificationController::class, 'markAllRead']);
Route::post('notifications/{id}/read', [NotificationController::class, 'markRead']);

// Capacity (patient / doctor / clinic / admin) is derived server-side from the caller.
Route::post('appointments', [AppointmentController::class, 'store'])->middleware('throttle:20,1');
Route::get('patient/appointments', [AppointmentController::class, 'patientIndex']);
Route::get('patient/appointments/summary', [AppointmentController::class, 'patientSummary']);
Route::get('appointments/{appointment}', [AppointmentController::class, 'show']);
Route::post('appointments/{appointment}/reschedule', [AppointmentController::class, 'reschedule']);
Route::post('appointments/{appointment}/review', [ReviewController::class, 'store']);
Route::post('reviews/{review}/report', [ReviewController::class, 'report'])->middleware('throttle:10,1');
Route::post('appointments/{appointment}/{action}', [AppointmentController::class, 'transition'])
    ->where('action', 'confirm|reject|complete|no-show|cancel');
