<?php

use App\Models\DoctorProfile;
use App\Models\UrgentRequest;
use App\Models\UrgentRequestDispatch;
use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

// Private per-user channel (notifications).
Broadcast::channel('App.Models.User.{id}', fn (User $user, string $id) => $user->id === $id);

// Urgent request status: only the requesting patient and doctors it was dispatched to.
Broadcast::channel('urgent-request.{id}', function (User $user, string $id) {
    $request = UrgentRequest::with('patientProfile')->find($id);
    if (! $request) {
        return false;
    }
    if ($request->patientProfile->user_id === $user->id) {
        return true;
    }
    $doctorId = DoctorProfile::where('user_id', $user->id)->value('id');

    return $doctorId !== null && UrgentRequestDispatch::where('urgent_request_id', $id)->where('doctor_profile_id', $doctorId)->exists();
});
