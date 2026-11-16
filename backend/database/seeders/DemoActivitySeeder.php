<?php

namespace Database\Seeders;

use App\Actions\Reviews\ReviewActions;
use App\Enums\ActorRole;
use App\Enums\AppointmentStatus;
use App\Enums\UrgentStatus;
use App\Models\Appointment;
use App\Models\Consent;
use App\Models\DoctorDocument;
use App\Models\DoctorProfile;
use App\Models\Governorate;
use App\Models\MedicalService;
use App\Models\PatientProfile;
use App\Models\Review;
use App\Models\ReviewReport;
use App\Models\Specialty;
use App\Models\UrgentRequest;
use App\Models\UrgentRequestDispatch;
use App\Models\User;
use App\Models\VolunteerAvailability;
use App\Models\VolunteerProfile;
use Carbon\CarbonImmutable;
use Database\Seeders\Support\DemoFactory;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;

/**
 * Realistic activity for every dashboard: appointments in every status (past + upcoming),
 * reviews (incl. a hidden/reported one), volunteer doctors with live availability, closed urgent
 * request history and a pending verification application with a document.
 *
 * Idempotent: appointments are keyed by fixed references (MB-DEMOxxxx), reviews by appointment,
 * urgent requests by (patient, description). Existing rows are left untouched, except that reviews on
 * the RATING_FIXTURES visits are removed on every run; `demo:seed --fresh` rebuilds everything with
 * dates relative to "now".
 */
class DemoActivitySeeder extends Seeder
{
    private const TZ = 'Africa/Cairo';

    /** ref => [doctor, patient, workday offset, local time, final status, booked_via] */
    private const APPOINTMENTS = [
        'MB-DEMO0001' => ['dr.karim@example.test', 'patient@example.test', -7, '10:00', AppointmentStatus::Completed, 'patient'],
        'MB-DEMO0002' => ['dr.salma@example.test', 'patient@example.test', -5, '11:00', AppointmentStatus::Completed, 'patient'],
        'MB-DEMO0003' => ['dr.karim@example.test', 'patient@example.test', -3, '10:20', AppointmentStatus::CancelledByPatient, 'patient'],
        'MB-DEMO0004' => ['dr.nour@example.test', 'patient@example.test', -2, '10:00', AppointmentStatus::NoShow, 'patient'],
        'MB-DEMO0005' => ['dr.karim@example.test', 'patient@example.test', 2, '11:00', AppointmentStatus::Confirmed, 'patient'],
        'MB-DEMO0006' => ['dr.omar@example.test', 'patient@example.test', 3, '10:00', AppointmentStatus::PendingConfirmation, 'patient'],
        'MB-DEMO0007' => ['dr.hany@example.test', 'patient@example.test', -4, '10:00', AppointmentStatus::Rejected, 'patient'],
        'MB-DEMO0008' => ['dr.karim@example.test', 'patient2@example.test', -6, '10:40', AppointmentStatus::Completed, 'patient'],
        'MB-DEMO0009' => ['dr.salma@example.test', 'patient2@example.test', -6, '10:00', AppointmentStatus::Completed, 'patient'],
        'MB-DEMO0010' => ['dr.youssef@example.test', 'patient2@example.test', 4, '10:00', AppointmentStatus::Confirmed, 'patient'],
        'MB-DEMO0011' => ['dr.mona@example.test', 'patient2@example.test', -1, '10:00', AppointmentStatus::Expired, 'patient'],
        'MB-DEMO0012' => ['dr.karim@example.test', 'patient2@example.test', 1, '10:00', AppointmentStatus::CancelledByDoctor, 'patient'],
        'MB-DEMO0013' => ['dr.salma@example.test', 'patient2@example.test', 2, '10:00', AppointmentStatus::Confirmed, 'clinic_staff'],
        'MB-DEMO0014' => ['dr.karim@example.test', 'patient2@example.test', 3, '13:00', AppointmentStatus::Confirmed, 'clinic_staff'],
        // Rating fixtures (see RATING_FIXTURES): completed visits that are never reviewed by the seeder.
        'MB-RATE0001' => ['dr.nour@example.test', 'patient@example.test', -8, '11:00', AppointmentStatus::Completed, 'patient'],
        'MB-RATE0002' => ['dr.hany@example.test', 'patient@example.test', -9, '11:00', AppointmentStatus::Completed, 'patient'],
        'MB-RATE0003' => ['dr.youssef@example.test', 'patient@example.test', -10, '11:00', AppointmentStatus::Completed, 'patient'],
    ];

    /**
     * Completed visits of patient@example.test that are reviewable again after every seed run, so the
     * "patient rates a completed visit" journey (E2E reviews.spec.ts) always has data to work on.
     */
    public const RATING_FIXTURES = ['MB-RATE0001', 'MB-RATE0002', 'MB-RATE0003'];

    /** ref => [rating, comment, hidden?] */
    private const REVIEWS = [
        'MB-DEMO0001' => [5, 'طبيب ممتاز وشرح الحالة بوضوح. (تقييم تجريبي)', false],
        'MB-DEMO0008' => [4, 'Very attentive, short waiting time. (demo review)', false],
        'MB-DEMO0009' => [2, 'تعليق غير لائق تم إخفاؤه (تقييم تجريبي)', true],
    ];

    public function run(): void
    {
        $users = User::whereIn('email', array_merge(
            array_column(self::APPOINTMENTS, 0), array_column(self::APPOINTMENTS, 1),
            ['admin@example.test', 'reception@example.test', 'dr.volunteer@example.test', 'dr.mona@example.test', 'dr.pending@example.test', 'dr.pending2@example.test'],
        ))->get()->keyBy('email');

        $this->appointments($users);
        $this->resetRatingFixtures();
        $this->reviews($users);
        $this->volunteers($users);
        $this->urgentHistory($users);
        $this->pendingApplications($users);
    }

    /** @param  Collection<string, User>  $users */
    private function appointments(Collection $users): void
    {
        foreach (self::APPOINTMENTS as $ref => $definition) {
            if (Appointment::where('reference', $ref)->exists()) {
                continue;
            }
            if (! $this->appointment($ref, $definition, $users)) {
                // Someone already booked that period in this environment: skip, data stays consistent.
                $this->command?->warn("Skipped {$ref}: period already taken.");
            }
        }
    }

    /**
     * Inserts one scripted appointment with its status history; false when the period is already taken.
     *
     * @param  array{string, string, int, string, AppointmentStatus, string}  $definition
     * @param  Collection<string, User>  $users
     */
    private function appointment(string $ref, array $definition, Collection $users): bool
    {
        [$doctorEmail, $patientEmail, $offset, $time, $final, $via] = $definition;
        $doctorUser = $users[$doctorEmail];
        $patientUser = $users[$patientEmail];
        $doctor = DoctorProfile::where('user_id', $doctorUser->id)->firstOrFail();
        $patient = PatientProfile::where('user_id', $patientUser->id)->firstOrFail();
        $service = MedicalService::where('doctor_profile_id', $doctor->id)->where('consultation_type', 'in_person')->firstOrFail();
        $start = CarbonImmutable::parse($this->workday($offset).' '.$time, self::TZ)->utc();
        $byStaff = $via === 'clinic_staff';
        $booker = $byStaff ? $users['reception@example.test'] : $patientUser;
        $created = $start->subDays(3);
        $requested = in_array($final, [AppointmentStatus::PendingConfirmation, AppointmentStatus::Expired, AppointmentStatus::Rejected], true);
        $initial = $requested ? AppointmentStatus::PendingConfirmation : AppointmentStatus::Confirmed;

        $a = DemoFactory::appointment($ref, $doctor, $patient, $service, $start, $doctor->buffer_minutes, $booker, $via);
        $a->hold_expires_at = $requested ? ($final === AppointmentStatus::PendingConfirmation ? $start->subHours(2) : $created->addHour()) : null;
        $a->status = $final;
        $a->created_at = $created;
        $a->confirmed_at = $requested ? null : $created;
        if ($final === AppointmentStatus::Completed) {
            $a->completed_at = $a->ends_at;
        }
        if ($final->isCancellation()) {
            $byDoctor = $final === AppointmentStatus::CancelledByDoctor;
            $a->cancelled_at = $created->addDay();
            $a->cancelled_by_user_id = $byDoctor ? $doctorUser->id : $patientUser->id;
            $a->cancellation_reason = $byDoctor ? 'Doctor travelling to a conference (demo)' : 'Plans changed (demo)';
        }
        if ($final === AppointmentStatus::Rejected) {
            $a->cancellation_reason = 'Fully booked that day (demo)';
        }

        $histories = [['from_status' => null, 'to_status' => $initial, 'actor_user_id' => $booker->id,
            'actor_role' => $byStaff ? ActorRole::Clinic : ActorRole::Patient, 'created_at' => $created]];
        if ($final !== $initial) {
            [$role, $by] = match ($final) {
                AppointmentStatus::Completed, AppointmentStatus::NoShow, AppointmentStatus::Rejected, AppointmentStatus::CancelledByDoctor => [ActorRole::Doctor, $doctorUser->id],
                AppointmentStatus::Expired => [ActorRole::System, null],
                default => [ActorRole::Patient, $patientUser->id],
            };
            $histories[] = ['from_status' => $initial, 'to_status' => $final, 'actor_user_id' => $by,
                'actor_role' => $role, 'reason' => $a->cancellation_reason, 'created_at' => $created->addDay()];
        }

        return DemoFactory::save($a, $histories);
    }

    /** Deletes reviews left on the rating fixtures (their reports cascade) and refreshes the doctors' ratings. */
    private function resetRatingFixtures(): void
    {
        $reviews = Review::whereHas('appointment', fn ($q) => $q->whereIn('reference', self::RATING_FIXTURES))->get();
        $actions = app(ReviewActions::class);
        foreach ($reviews as $review) {
            $review->delete();
            $actions->recalculate($review->doctor_profile_id);
        }
    }

    /** @param  Collection<string, User>  $users */
    private function reviews(Collection $users): void
    {
        $actions = app(ReviewActions::class);
        $admin = $users['admin@example.test'];
        foreach (self::REVIEWS as $ref => [$rating, $comment, $hidden]) {
            $a = Appointment::where('reference', $ref)->where('status', 'completed')->first();
            if (! $a) {
                continue;
            }
            $review = Review::firstOrCreate(['appointment_id' => $a->id], [
                'doctor_profile_id' => $a->doctor_profile_id, 'patient_profile_id' => $a->patient_profile_id,
                'rating' => $rating, 'comment' => $comment,
            ]);
            if ($hidden) {
                ReviewReport::firstOrCreate(['review_id' => $review->id, 'reporter_user_id' => $users['patient@example.test']->id],
                    ['reason' => 'Inappropriate language (demo report)']);
                $review->forceFill(['status' => 'hidden', 'moderated_by' => $admin->id, 'moderated_at' => now(), 'moderation_reason' => 'Policy violation (demo)'])->save();
            }
            $actions->recalculate($a->doctor_profile_id);
        }
    }

    /**
     * dr.volunteer (Cairo-wide, live "now" window) and dr.mona (Nasr City, "tonight" window).
     *
     * @param  Collection<string, User>  $users
     */
    private function volunteers(Collection $users): void
    {
        $gp = Specialty::where('slug', 'general-practice')->firstOrFail();
        $cairo = Governorate::where('slug', 'cairo')->firstOrFail();
        $nasr = $cairo->cities()->where('slug', 'nasr-city')->firstOrFail();

        foreach ([
            'dr.volunteer@example.test' => [null, 2, 'now'],
            'dr.mona@example.test' => [$nasr->id, 1, 'tonight'],
        ] as $email => [$cityId, $max, $kind]) {
            $doctor = DoctorProfile::where('user_id', $users[$email]->id)->firstOrFail();
            $profile = VolunteerProfile::updateOrCreate(['doctor_profile_id' => $doctor->id], [
                'status' => 'active', 'accepts_online' => true, 'accepts_in_person' => true,
                'max_concurrent_requests' => $max, 'opted_in_at' => now()->subMonth(), 'last_availability_update_at' => now(),
            ]);
            $profile->specialties()->sync([$gp->id]);
            $profile->locations()->delete();
            $profile->locations()->create(['governorate_id' => $cairo->id, 'city_id' => $cityId]);

            // Availability is time-bounded: every seed run opens a fresh window.
            $profile->availabilities()->where('ends_at', '>', now())->delete();
            [$from, $to] = $kind === 'now'
                ? [now()->subMinute(), now()->addHours(12)]
                : [CarbonImmutable::now(self::TZ)->setTime(20, 0)->utc(), CarbonImmutable::now(self::TZ)->addDay()->setTime(8, 0)->utc()];
            VolunteerAvailability::create(['volunteer_profile_id' => $profile->id, 'starts_at' => $from, 'ends_at' => $to, 'mode' => 'both', 'kind' => $kind]);
        }
    }

    /**
     * Closed urgent requests for patient2 (keeps patient@example.test free to open a new one).
     *
     * @param  Collection<string, User>  $users
     */
    private function urgentHistory(Collection $users): void
    {
        $patientUser = $users['patient2@example.test'];
        $patient = PatientProfile::where('user_id', $patientUser->id)->firstOrFail();
        $volunteer = DoctorProfile::where('user_id', $users['dr.volunteer@example.test']->id)->firstOrFail();
        $mona = DoctorProfile::where('user_id', $users['dr.mona@example.test']->id)->firstOrFail();
        $cairo = Governorate::where('slug', 'cairo')->firstOrFail();
        $nasr = $cairo->cities()->where('slug', 'nasr-city')->firstOrFail();
        $gp = Specialty::where('slug', 'general-practice')->firstOrFail();

        foreach ($this->urgentCases($volunteer, $mona) as [$description, $status, $daysAgo, $dispatches, $flag]) {
            if (UrgentRequest::where('patient_profile_id', $patient->id)->where('description', $description)->exists()) {
                continue;
            }
            $at = now()->toImmutable()->subDays($daysAgo);
            $consent = Consent::create(['user_id' => $patientUser->id, 'type' => 'urgent_data_sharing', 'granted' => true, 'granted_at' => $at]);
            $r = new UrgentRequest([
                'patient_profile_id' => $patient->id, 'specialty_id' => $gp->id, 'description' => $description,
                'consultation_type' => 'online', 'governorate_id' => $cairo->id, 'city_id' => $nasr->id,
                'contact_phone' => '01000000002', 'disclaimer_acknowledged_at' => $at, 'consent_id' => $consent->id,
                'expires_at' => $at->addMinutes(5), 'current_tier' => 1, 'started_at' => null,
            ]);
            $r->status = $status;
            $r->closed_at = $at->addMinutes($status === UrgentStatus::Completed ? 40 : 4);
            $r->close_reason = match ($status) {
                UrgentStatus::Completed => 'completed', UrgentStatus::Unmatched => 'no_volunteer_accepted', default => 'patient_cancelled',
            };
            if ($status === UrgentStatus::Completed) {
                $r->accepted_doctor_profile_id = $volunteer->id;
                $r->accepted_at = $at->addMinutes(1);
                $r->started_at = $at->addMinutes(5);
            }
            if ($flag) {
                $r->flagged_at = $at->addMinutes(2);
                $r->flagged_by = $mona->user_id;
                $r->flag_reason = $flag;
            }
            $r->created_at = $at;
            $r->save();

            foreach ($dispatches as [$doctor, $dStatus]) {
                UrgentRequestDispatch::updateOrCreate(
                    ['urgent_request_id' => $r->id, 'doctor_profile_id' => $doctor->id],
                    ['tier' => 1, 'status' => $dStatus, 'notified_at' => $at, 'responded_at' => $at->addMinute()],
                );
            }
        }
    }

    /**
     * Closed urgent cases: [description, final status, days ago, [[doctor, dispatch status], ...], flag reason].
     *
     * @return list<array{string, UrgentStatus, int, list<array{DoctorProfile, string}>, string|null}>
     */
    private function urgentCases(DoctorProfile $volunteer, DoctorProfile $mona): array
    {
        return [
            ['Fever and sore throat since yesterday (demo)', UrgentStatus::Completed, 2, [[$volunteer, 'accepted'], [$mona, 'lost']], null],
            ['Mild allergic rash after new medication (demo)', UrgentStatus::Unmatched, 1, [[$mona, 'expired']], null],
            ['Test request flagged as prank (demo)', UrgentStatus::Cancelled, 3, [[$mona, 'expired']], 'Repeated prank requests (demo flag)'],
        ];
    }

    /**
     * Pending applications with an uploaded (synthetic) license document.
     *
     * @param  Collection<string, User>  $users
     */
    private function pendingApplications(Collection $users): void
    {
        foreach (['dr.pending@example.test', 'dr.pending2@example.test'] as $email) {
            if (! isset($users[$email])) {
                continue;
            }
            $doctor = DoctorProfile::where('user_id', $users[$email]->id)->firstOrFail();
            $path = "verification/{$doctor->id}/demo-license.pdf";
            Storage::disk('local')->put($path, "%PDF-1.4\n% Synthetic demo license document - not a real license\n%%EOF\n");
            DoctorDocument::updateOrCreate(
                ['doctor_profile_id' => $doctor->id, 'original_name' => 'demo-license.pdf'],
                ['type' => 'license', 'disk' => 'local', 'path' => $path, 'mime' => 'application/pdf', 'size' => Storage::disk('local')->size($path)],
            );
        }
    }

    /** Local date of the |n|-th working day (Sat–Thu) after (n>0) or before (n<0) today. */
    private function workday(int $offset): string
    {
        $day = CarbonImmutable::now(self::TZ)->startOfDay();
        $step = $offset >= 0 ? 1 : -1;
        $remaining = abs($offset);
        while ($remaining > 0) {
            $day = $day->addDays($step);
            if (! $day->isFriday()) {
                $remaining--;
            }
        }

        return $day->toDateString();
    }
}
