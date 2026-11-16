<?php

namespace App\Http\Controllers\Api\V1\Doctor;

use App\Http\Controllers\Controller;
use App\Models\DoctorProfile;
use Illuminate\Http\Request;

/** Base for /doctor/* endpoints: every action operates on the caller's own doctor profile only. */
abstract class DoctorController extends Controller
{
    protected function doctor(Request $request): DoctorProfile
    {
        return DoctorProfile::forUser($request->user());
    }
}
