<?php

use App\Http\Controllers\Api\V1\UrgentMessageController;
use App\Http\Controllers\Api\V1\UrgentRequestController;
use Illuminate\Support\Facades\Route;

/* Urgent live consultation (separate from appointments). The doctor inbox lives in doctor.php. */
Route::post('urgent-requests', [UrgentRequestController::class, 'store'])->middleware('throttle:urgent');
Route::get('patient/urgent-requests', [UrgentRequestController::class, 'patientIndex']);
Route::get('urgent-requests/{urgentRequest}', [UrgentRequestController::class, 'show']);
Route::post('urgent-requests/{urgentRequest}/cancel', [UrgentRequestController::class, 'cancel']);
// Patient ↔ accepted doctor thread: participants only (404 otherwise), after acceptance.
Route::get('urgent-requests/{urgentRequest}/messages', [UrgentMessageController::class, 'index']);
Route::post('urgent-requests/{urgentRequest}/messages', [UrgentMessageController::class, 'store'])->middleware('throttle:30,1');
Route::post('urgent-requests/{urgentRequest}/{action}', [UrgentRequestController::class, 'respond'])
    ->where('action', 'accept|decline|start|complete|report')->middleware(['role:doctor', 'throttle:60,1']);
