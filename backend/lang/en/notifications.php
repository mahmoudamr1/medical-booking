<?php

return [
    'open_platform' => 'Open Medical Booking',
    'verification' => [
        'title' => 'Verification update',
        'approved' => 'Your doctor profile has been verified and is now visible to patients.',
        'rejected' => 'Your verification application was not approved.',
        'suspended' => 'Your doctor profile has been suspended.',
        'pending' => 'Your verification application is under review.',
        'draft' => 'Your profile needs to be completed.',
    ],
    'verification_requested' => [
        'title' => 'New verification request',
        'body' => ':name submitted documents for verification.',
    ],
    'appointment' => [
        'booked_patient' => ['title' => 'Appointment booked', 'body' => 'Your appointment :reference with :doctor on :when is booked.'],
        'booked_doctor' => ['title' => 'New appointment', 'body' => ':patient booked appointment :reference on :when.'],
        'booked_clinic' => ['title' => 'New clinic booking', 'body' => ':patient booked :doctor (:reference) on :when.'],
        'confirmed' => ['title' => 'Appointment confirmed', 'body' => 'Appointment :reference with :doctor on :when is confirmed.'],
        'rejected' => ['title' => 'Appointment request declined', 'body' => 'Your request :reference with :doctor on :when was declined. :reason'],
        'cancelled' => ['title' => 'Appointment cancelled', 'body' => 'Appointment :reference on :when was cancelled. :reason'],
        'completed' => ['title' => 'Visit completed', 'body' => 'Your visit :reference with :doctor is complete. You can now leave a review.'],
        'no_show' => ['title' => 'Missed appointment', 'body' => 'Appointment :reference on :when was marked as missed.'],
        'expired' => ['title' => 'Request expired', 'body' => 'Your request :reference with :doctor expired before confirmation.'],
        'rescheduled_doctor' => ['title' => 'Appointment rescheduled', 'body' => ':patient moved their appointment to :when (:reference).'],
        'rescheduled_patient' => ['title' => 'Appointment rescheduled', 'body' => 'Your appointment with :doctor is now on :when (:reference).'],
        'reminder' => ['title' => 'Upcoming appointment', 'body' => 'Reminder: appointment :reference with :doctor on :when.'],
    ],
    'clinic_invitation' => ['title' => 'Clinic invitation', 'body' => 'You were invited to join :clinic as :role.'],
    'urgent' => [
        'new_request' => ['title' => 'New urgent request', 'body' => 'A patient near :place needs :specialty (:severity, as reported by the patient). Open the request to accept or decline.'],
        'accepted' => ['title' => 'A doctor accepted your request', 'body' => ':doctor accepted your urgent request and will contact you.'],
        'taken' => ['title' => 'Request already taken', 'body' => 'Another volunteer accepted the urgent request near :place. Thank you.'],
        'waiting' => ['title' => 'No doctor is available right now', 'body' => 'No doctor is available to take your urgent request right now. We are keeping it open until :until and will notify you as soon as a doctor becomes available. You can cancel it or book a regular appointment at any time.'],
        'redispatched' => ['title' => 'A doctor just became available', 'body' => 'Your urgent request has been sent to a doctor who just became available. We will notify you as soon as a doctor accepts.'],
        'unmatched' => ['title' => 'No doctor accepted your request', 'body' => 'No doctor was able to accept your urgent request right now. You can try again in a few minutes or book a regular appointment.'],
        'cancelled' => ['title' => 'Urgent request cancelled', 'body' => 'The patient cancelled the urgent request.'],
    ],
    'admin' => [
        'review_reported' => ['title' => 'Review reported', 'body' => 'A patient review was reported and needs moderation.'],
        'urgent_flagged' => ['title' => 'Urgent request flagged', 'body' => 'A volunteer doctor reported an urgent request as possible abuse.'],
        'suspicious_activity' => ['title' => 'Suspicious activity', 'body' => 'Unusual account activity was detected.'],
    ],
];
