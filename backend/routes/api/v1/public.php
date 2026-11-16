<?php

use App\Http\Controllers\Api\V1\Public\AvailabilityController;
use App\Http\Controllers\Api\V1\Public\ClinicDirectoryController;
use App\Http\Controllers\Api\V1\Public\DirectoryController;
use App\Http\Controllers\Api\V1\Public\DoctorController as PublicDoctorController;
use App\Http\Controllers\Api\V1\Public\HomeController;
use App\Http\Controllers\Api\V1\Public\UrgentAvailabilityController;
use App\Http\Controllers\Api\V1\ReviewController;
use Illuminate\Support\Facades\Route;

/* Public directory (guests allowed). */
Route::get('home', HomeController::class);
Route::get('settings/public', [HomeController::class, 'settings']);
Route::get('specialties', [DirectoryController::class, 'specialties']);
Route::get('specialties/{slug}', [DirectoryController::class, 'specialty']);
Route::get('locations/governorates', [DirectoryController::class, 'governorates']);
Route::get('locations/governorates/{governorate}/cities', [DirectoryController::class, 'cities']);
Route::get('locations/cities/{city}/areas', [DirectoryController::class, 'areas']);
Route::get('doctors', [PublicDoctorController::class, 'index']);
Route::get('doctors/{doctor}', [PublicDoctorController::class, 'show']);
Route::get('doctors/{doctor}/services', [PublicDoctorController::class, 'services']);
Route::get('doctors/{doctor}/reviews', [ReviewController::class, 'index']);
Route::get('doctors/{doctor}/availability', AvailabilityController::class)->middleware('throttle:60,1');
Route::get('doctors/{doctor}/avatar', [PublicDoctorController::class, 'avatar'])->name('public.doctor-avatar');
Route::get('clinics', [ClinicDirectoryController::class, 'index']);
Route::get('clinics/{slug}', [ClinicDirectoryController::class, 'show'])->where('slug', '[a-z0-9-]+');
Route::get('clinics/{slug}/logo', [ClinicDirectoryController::class, 'logo'])->where('slug', '[a-z0-9-]+')->name('public.clinic-logo');
Route::get('urgent/available-doctors', UrgentAvailabilityController::class)->middleware('throttle:60,1');
