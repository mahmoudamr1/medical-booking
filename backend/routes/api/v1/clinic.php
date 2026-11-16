<?php

use App\Http\Controllers\Api\V1\Clinic\BranchController;
use App\Http\Controllers\Api\V1\Clinic\ClinicAppointmentController;
use App\Http\Controllers\Api\V1\Clinic\ClinicDoctorController;
use App\Http\Controllers\Api\V1\Clinic\ClinicReportController;
use App\Http\Controllers\Api\V1\Clinic\ClinicUrgentAvailabilityController;
use App\Http\Controllers\Api\V1\Clinic\OrganizationController;
use App\Http\Controllers\Api\V1\Clinic\StaffController;
use Illuminate\Support\Facades\Route;

/* Clinic organizations (tenant-scoped). */
Route::post('clinics', [OrganizationController::class, 'store']);
Route::get('my/clinics', [OrganizationController::class, 'mine']);
Route::get('my/invitations', [StaffController::class, 'myInvitations']);
Route::post('my/invitations/{membership}/{decision}', [StaffController::class, 'respond'])->where('decision', 'accept|decline');

// Every route below resolves {clinic} through the caller's ACTIVE membership (404 otherwise)
// and checks the clinic-role permission named in tenant:<permission>.
Route::prefix('clinics/{clinic}')->where(['clinic' => '[0-9a-hjkmnp-tv-z]{26}'])->group(function () {
    Route::get('manage', [OrganizationController::class, 'show'])->middleware('tenant');
    Route::put('manage', [OrganizationController::class, 'update'])->middleware('tenant:clinic.organization.manage');

    Route::get('branches', [BranchController::class, 'index'])->middleware('tenant');
    Route::middleware('tenant:clinic.branches.manage')->group(function () {
        Route::post('branches', [BranchController::class, 'store']);
        Route::put('branches/{branch}', [BranchController::class, 'update']);
        Route::delete('branches/{branch}', [BranchController::class, 'destroy']);
        Route::put('branches/{branch}/hours', [BranchController::class, 'hours']);
    });

    Route::middleware('tenant:clinic.staff.manage')->group(function () {
        Route::get('staff', [StaffController::class, 'index']);
        Route::post('staff', [StaffController::class, 'invite']);
        Route::put('staff/{membership}', [StaffController::class, 'update']);
        Route::delete('staff/{membership}', [StaffController::class, 'destroy']);
    });

    Route::get('doctors', [ClinicDoctorController::class, 'index'])->middleware('tenant:clinic.schedules.view');
    Route::post('doctors', [ClinicDoctorController::class, 'store'])->middleware('tenant:clinic.doctors.manage');
    Route::delete('doctors/{affiliation}', [ClinicDoctorController::class, 'destroy'])->middleware('tenant:clinic.doctors.manage');
    Route::get('services', [ClinicDoctorController::class, 'services'])->middleware('tenant:clinic.schedules.view');
    Route::get('schedules', [ClinicDoctorController::class, 'schedules'])->middleware('tenant:clinic.schedules.view');

    Route::get('appointments', [ClinicAppointmentController::class, 'index'])->middleware('tenant:clinic.appointments.view');
    Route::get('appointments/{appointment}', [ClinicAppointmentController::class, 'show'])->middleware('tenant:clinic.appointments.view');
    Route::post('appointments', [ClinicAppointmentController::class, 'store'])->middleware(['tenant:clinic.appointments.book', 'throttle:30,1']);
    Route::post('appointments/{appointment}/{action}', [ClinicAppointmentController::class, 'transition'])
        ->where('action', 'confirm|reject|complete|no-show|cancel')->middleware('tenant:clinic.appointments.manage');

    Route::get('reports', ClinicReportController::class)->middleware('tenant:clinic.reports.view');
    Route::get('urgent-availability', ClinicUrgentAvailabilityController::class)->middleware('tenant:clinic.schedules.view');
});
