<?php

namespace Database\Seeders;

use App\Actions\Clinics\CreateClinic;
use App\Actions\Reviews\ReviewActions;
use App\Enums\ActorRole;
use App\Enums\AppointmentStatus;
use App\Enums\ConsultationType;
use App\Enums\RoleName;
use App\Enums\VerificationStatus;
use App\Models\Appointment;
use App\Models\Clinic;
use App\Models\ClinicBranch;
use App\Models\DoctorBranchAffiliation;
use App\Models\DoctorProfile;
use App\Models\DoctorSchedule;
use App\Models\MedicalService;
use App\Models\PatientProfile;
use App\Models\Review;
use App\Models\Specialty;
use App\Models\User;
use App\Services\Demo\DemoImageGenerator;
use Carbon\CarbonImmutable;
use Database\Seeders\Support\DemoFactory;
use Database\Seeders\Support\ShowcaseCatalog as Catalog;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;

/**
 * "Showcase" data that makes the demo look like a real marketplace: more clinics (with generated
 * logos), ~110 more doctors across specialties and governorates (generated avatars, realistic bios),
 * synthetic patients and realistic reviews/ratings. 100% synthetic. Idempotent (keyed by email,
 * slug and fixed MB-SHxxxxxx / MB-UPxxxxxx references).
 */
class DemoShowcaseSeeder extends Seeder
{
    private const TZ = 'Africa/Cairo';

    /** Doctors of the original 2-per-specialty set: their indexes (0..27) and branches never change. */
    private const ORIGINAL_DOCTORS = 28;

    /** Branches created by the original (pre-expansion) clinic list; keeps doctor->branch mapping stable. */
    private const ORIGINAL_BRANCH_COUNT = 8;

    /** Showcase doctors per specialty (the first 2 are the original set). */
    private const PER_SPECIALTY = 8;

    /** Branch opening hours: Sat–Thu 09:00–22:00, Friday 14:00–20:00. */
    private const BRANCH_HOURS = [
        [6, '09:00', '22:00'], [0, '09:00', '22:00'], [1, '09:00', '22:00'], [2, '09:00', '22:00'],
        [3, '09:00', '22:00'], [4, '09:00', '22:00'], [5, '14:00', '20:00'],
    ];

    /** Clinic shifts by doctor index: [starts, ends, break starts, break ends]. */
    private const SHIFTS = [
        ['10:00', '14:00', '12:00', '12:30'],
        ['12:00', '17:00', '14:00', '14:30'],
        ['16:00', '21:00', '18:00', '18:30'],
    ];

    private DemoImageGenerator $images;

    public function run(): void
    {
        $this->images = app(DemoImageGenerator::class);
        $admin = User::where('email', 'admin@example.test')->firstOrFail();

        $branches = $this->clinics();
        $patients = $this->patients();
        $specialties = Specialty::where('is_active', true)->pluck('id', 'slug')->all();

        foreach ($this->plan() as $i => $slug) {
            $branch = $i < self::ORIGINAL_DOCTORS ? $branches[$i % self::ORIGINAL_BRANCH_COUNT] : $branches[$i % count($branches)];
            $doctor = $this->doctor($i, $slug, $specialties[$slug], $admin);
            $service = $this->practice($doctor, $branch, $slug, $i);
            $this->schedule($doctor, $branch, $i);
            $this->history($doctor, $service, $patients, $i);
            $this->upcoming($doctor, $service, $patients, $i);
        }

        $this->coreDoctorAvatars();
        $this->coreClinicTypes();
        $this->clinicLogos();
    }

    // ---- Organizations and people ------------------------------------------------

    /** @return list<ClinicBranch> */
    private function clinics(): array
    {
        $owner = DemoFactory::user('showcase.owner@example.test', 'إدارة مجموعة العيادات (تجريبي)', [RoleName::Patient]);
        $branches = [];
        foreach (Catalog::CLINICS as $slug => [$nameAr, $nameEn, $branchDefs]) {
            $clinic = $this->clinic($owner, $slug, $nameAr, $nameEn);
            foreach ($branchDefs as [$citySlug, $branchAr, $branchEn, $addressAr, $addressEn]) {
                $branches[] = DemoFactory::branch($clinic, $citySlug, [
                    'name_ar' => $branchAr, 'name_en' => $branchEn, 'address_ar' => $addressAr, 'address_en' => $addressEn,
                    'phone' => '01'.substr((string) crc32($branchEn), 0, 9),
                ], self::BRANCH_HOURS);
            }
        }

        return $branches;
    }

    private function clinic(User $owner, string $slug, string $nameAr, string $nameEn): Clinic
    {
        $clinic = Clinic::where('slug', $slug)->first()
            ?? app(CreateClinic::class)->handle($owner, ['name_ar' => $nameAr, 'name_en' => $nameEn]);
        $clinic->forceFill(['type' => Catalog::TYPES[$slug]])->save();
        $clinic->update(['slug' => $slug, 'phone' => '02'.substr((string) crc32($slug), 0, 8),
            'email' => "info@{$slug}.example.test",
            'description_ar' => "{$nameAr} يقدم خدمات طبية متكاملة بأحدث الأجهزة وفريق من الاستشاريين. (بيانات تجريبية)",
            'description_en' => "{$nameEn} offers comprehensive care with modern equipment and a team of consultants. (demo data)"]);

        return $clinic;
    }

    /** @return list<PatientProfile> */
    private function patients(): array
    {
        $patients = [];
        for ($n = 1; $n <= 60; $n++) {
            $female = $n % 2 === 0;
            $name = ($female ? Catalog::FEMALE : Catalog::MALE)[($n * 3) % 15].' '.Catalog::FAMILY[($n * 4) % 15];
            $user = DemoFactory::user('patient.'.str_pad((string) $n, 2, '0', STR_PAD_LEFT).'@example.test', $name, [RoleName::Patient]);
            $patients[] = PatientProfile::firstOrCreate(['user_id' => $user->id], ['gender' => $female ? 'female' : 'male']);
        }

        return $patients;
    }

    // ---- Doctors -----------------------------------------------------------------

    /**
     * Specialty of each showcase doctor by index: the original 2-per-specialty set first
     * (indexes 0..27 unchanged), then the extra rounds.
     *
     * @return list<string>
     */
    private function plan(): array
    {
        $slugs = array_keys(Catalog::TITLES);
        $plan = [];
        foreach ($slugs as $slug) {
            $plan[] = $slug;
            $plan[] = $slug;
        }
        for ($round = 2; $round < self::PER_SPECIALTY; $round++) {
            array_push($plan, ...$slugs);
        }

        return $plan;
    }

    private function doctor(int $i, string $slug, string $specialtyId, User $admin): DoctorProfile
    {
        [$consultant, $specialist, $titleEn] = Catalog::TITLES[$slug];
        $female = ($i % 2) === 1;
        $name = $this->name($i, $female);
        $years = 4 + (($i * 5) % 24);
        $isConsultant = $years >= 12;
        $university = Catalog::UNIVERSITIES[$i % count(Catalog::UNIVERSITIES)];
        $email = 'doctor.'.str_pad((string) ($i + 1), 2, '0', STR_PAD_LEFT).'@example.test';

        $user = DemoFactory::user($email, $name, [RoleName::Patient, RoleName::Doctor]);
        PatientProfile::firstOrCreate(['user_id' => $user->id]);
        $doctor = DoctorProfile::firstOrNew(['user_id' => $user->id]);
        $doctor->fill([
            'title_ar' => $isConsultant ? $consultant : $specialist,
            'title_en' => ($isConsultant ? 'Consultant, ' : 'Specialist, ').$titleEn,
            'gender' => $female ? 'female' : 'male',
            'years_experience' => $years,
            'bio_ar' => "{$name} — ".($isConsultant ? $consultant : $specialist)." بخبرة {$years} عاماً. خريج كلية الطب {$university}، "
                .'ويهتم بالتشخيص الدقيق ومتابعة المرضى بعد الكشف. (ملف تجريبي ببيانات غير حقيقية)',
            'bio_en' => ($isConsultant ? 'Consultant' : 'Specialist')." in {$titleEn} with {$years} years of experience. "
                .'Focused on accurate diagnosis and attentive follow-up. (Synthetic demo profile)',
            'qualifications' => "بكالوريوس الطب والجراحة - {$university}".($isConsultant ? "\nماجستير ودكتوراه {$titleEn}\nزمالة البورد المصري" : "\nماجستير {$titleEn}"),
            'license_number' => 'DEMO-SH-'.str_pad((string) ($i + 1), 4, '0', STR_PAD_LEFT),
            'lead_time_minutes' => 60, 'horizon_days' => 30,
            'booking_mode' => $i % 6 === 5 ? 'manual' : 'instant',
        ]);
        $doctor->verification_status = VerificationStatus::Approved;
        $doctor->verified_at ??= now()->subMonths(2);
        $doctor->verified_by = $admin->id;
        $doctor->verification_submitted_at ??= now()->subMonths(2);
        $doctor->save();

        $doctor->specialties()->sync([$specialtyId => ['is_primary' => true]]);
        $this->avatar($doctor, $female);

        return $doctor;
    }

    /** Deterministic Arabic name; unique (first, family) pairs per gender. */
    private function name(int $i, bool $female): string
    {
        $firstNames = $female ? Catalog::FEMALE : Catalog::MALE;
        if ($i < self::ORIGINAL_DOCTORS) {
            $first = $firstNames[$i % 15];
            $family = Catalog::FAMILY[($i * 7) % 15];
        } else {
            $j = intdiv($i - self::ORIGINAL_DOCTORS, 2); // per-gender counter
            $first = $firstNames[$j % 15];
            $family = Catalog::FAMILY[($j + 4 * intdiv($j, 15) + 3) % 15];
        }

        return 'د. '.$first.' '.$family;
    }

    /** Affiliates the doctor with the branch and publishes their services; returns the in-clinic service. */
    private function practice(DoctorProfile $doctor, ClinicBranch $branch, string $slug, int $i): MedicalService
    {
        [, , , [$minPrice, $maxPrice]] = Catalog::TITLES[$slug];
        $price = (int) (round(($minPrice + (($i * 37) % max(1, $maxPrice - $minPrice))) / 25) * 25);

        DoctorBranchAffiliation::updateOrCreate(['doctor_profile_id' => $doctor->id, 'clinic_branch_id' => $branch->id],
            ['clinic_id' => $branch->clinic_id, 'status' => 'active']);
        $service = MedicalService::updateOrCreate(
            ['doctor_profile_id' => $doctor->id, 'clinic_branch_id' => $branch->id, 'consultation_type' => ConsultationType::InPerson],
            ['clinic_id' => $branch->clinic_id, 'name_ar' => 'كشف بالعيادة', 'name_en' => 'Clinic consultation',
                'duration_minutes' => [15, 20, 30][$i % 3], 'price' => $price, 'is_active' => true],
        );
        if ($i % 3 !== 2) {
            MedicalService::updateOrCreate(
                ['doctor_profile_id' => $doctor->id, 'clinic_branch_id' => null, 'consultation_type' => ConsultationType::Online],
                ['name_ar' => 'استشارة أونلاين', 'name_en' => 'Online consultation', 'duration_minutes' => 15,
                    'price' => (int) (round($price * 0.7 / 25) * 25), 'is_active' => true],
            );
        }

        return $service;
    }

    /** Weekly clinic shifts (some with a break) plus online evenings for doctors who consult online. */
    private function schedule(DoctorProfile $doctor, ClinicBranch $branch, int $i): void
    {
        DoctorSchedule::where('doctor_profile_id', $doctor->id)->delete();
        [$start, $end, $breakStart, $breakEnd] = self::SHIFTS[$i % 3];
        $days = $i % 2 ? [6, 1, 3] : [0, 2, 4, 6];
        foreach ($days as $day) {
            $shift = DoctorSchedule::create(['doctor_profile_id' => $doctor->id, 'clinic_branch_id' => $branch->id,
                'day_of_week' => $day, 'starts_at' => $start, 'ends_at' => $end]);
            if ($i % 4 === 0) {
                $shift->breaks()->create(['starts_at' => $breakStart, 'ends_at' => $breakEnd]);
            }
        }
        if ($i % 3 !== 2) {
            foreach ([0, 2] as $day) {
                DoctorSchedule::create(['doctor_profile_id' => $doctor->id, 'clinic_branch_id' => null,
                    'day_of_week' => $day, 'starts_at' => '21:30', 'ends_at' => '23:30']);
            }
        }
    }

    // ---- Appointments ------------------------------------------------------------

    /**
     * Past completed visits with reviews → realistic rating averages and counts.
     *
     * @param  list<PatientProfile>  $patients
     */
    private function history(DoctorProfile $doctor, MedicalService $service, array $patients, int $i): void
    {
        $visits = 3 + ($i % 6);
        for ($v = 0; $v < $visits; $v++) {
            $ref = 'MB-SH'.str_pad((string) ($i * 10 + $v), 6, '0', STR_PAD_LEFT);
            if (Appointment::where('reference', $ref)->exists()) {
                continue;
            }
            $patient = $patients[($i + $v * 3) % count($patients)];
            $start = CarbonImmutable::now(self::TZ)->subDays(8 + $v * 6 + ($i % 5))->setTime(9, 0)->addMinutes(($i % 4) * 30)->utc();
            $booked = $start->subDays(2);

            $a = DemoFactory::appointment($ref, $doctor, $patient, $service, $start);
            $end = $a->ends_at;
            $a->status = AppointmentStatus::Completed;
            $a->confirmed_at = $booked;
            $a->completed_at = $end;
            $a->created_at = $booked;

            $pool = ($v % 3 === 2) ? Catalog::REVIEWS_EN : Catalog::REVIEWS_AR;
            [$rating, $comment] = $pool[($i + $v) % count($pool)];
            $review = function (Appointment $visit) use ($doctor, $patient, $rating, $comment, $end): void {
                Review::firstOrCreate(['appointment_id' => $visit->id], ['doctor_profile_id' => $doctor->id,
                    'patient_profile_id' => $patient->id, 'rating' => $rating, 'comment' => $comment, 'created_at' => $end->addDay()]);
            };

            DemoFactory::save($a, [
                ['to_status' => AppointmentStatus::Confirmed, 'actor_user_id' => $patient->user_id, 'actor_role' => ActorRole::Patient, 'created_at' => $booked],
                ['from_status' => AppointmentStatus::Confirmed, 'to_status' => AppointmentStatus::Completed, 'actor_user_id' => $doctor->user_id, 'actor_role' => ActorRole::Doctor, 'created_at' => $end],
            ], $v % 4 !== 3 ? $review : null); // not every visit gets reviewed
        }
        app(ReviewActions::class)->recalculate($doctor->id);
    }

    /**
     * 1-2 upcoming confirmed bookings on the doctor's real working days -> realistic busy calendars.
     *
     * @param  list<PatientProfile>  $patients
     */
    private function upcoming(DoctorProfile $doctor, MedicalService $service, array $patients, int $i): void
    {
        $rules = DoctorSchedule::where('doctor_profile_id', $doctor->id)
            ->where('clinic_branch_id', $service->clinic_branch_id)->get(['day_of_week', 'starts_at']);
        if ($rules->isEmpty()) {
            return;
        }
        for ($u = 0; $u < 1 + ($i % 2); $u++) {
            $ref = 'MB-UP'.str_pad((string) ($i * 10 + $u), 6, '0', STR_PAD_LEFT);
            if (Appointment::where('reference', $ref)->exists()) {
                continue;
            }
            $workingDay = $this->workingDay($rules, $u);
            if ($workingDay === null) {
                continue;
            }
            [$date, $rule] = $workingDay;
            $start = CarbonImmutable::parse($date->toDateString().' '.substr($rule->starts_at, 0, 5), self::TZ)
                ->addMinutes($service->duration_minutes * (1 + $u))->utc();
            $patient = $patients[($i * 3 + $u) % count($patients)];

            $a = DemoFactory::appointment($ref, $doctor, $patient, $service, $start, $doctor->buffer_minutes);
            $a->status = AppointmentStatus::Confirmed;
            $a->confirmed_at = now()->toImmutable();
            DemoFactory::save($a, [
                ['to_status' => AppointmentStatus::Confirmed, 'actor_user_id' => $patient->user_id, 'actor_role' => ActorRole::Patient],
            ]);
        }
    }

    /**
     * The u-th working day (and its schedule rule) of the doctor, starting 2 days from now (beyond lead time).
     *
     * @param  Collection<int, DoctorSchedule>  $rules
     * @return array{CarbonImmutable, DoctorSchedule}|null
     */
    private function workingDay(Collection $rules, int $u): ?array
    {
        $date = CarbonImmutable::now(self::TZ)->addDays(2)->startOfDay();
        $found = 0;
        for ($d = 0; $d < 21; $d++, $date = $date->addDay()) {
            $rule = $rules->firstWhere('day_of_week', $date->dayOfWeek);
            if ($rule && $found++ === $u) {
                return [$date, $rule];
            }
        }

        return null;
    }

    // ---- Images and core organizations -------------------------------------------

    private function coreDoctorAvatars(): void
    {
        foreach (Catalog::CORE_DOCTORS as $prefix => $female) {
            $doctor = DoctorProfile::whereHas('user', fn ($q) => $q->where('email', "{$prefix}@example.test"))->first();
            if ($doctor) {
                $doctor->forceFill(['gender' => $female ? 'female' : 'male'])->save();
                $this->avatar($doctor, $female);
            }
        }
    }

    private function coreClinicTypes(): void
    {
        foreach (['al-shifa-medical-center', 'nile-clinic'] as $coreSlug) {
            Clinic::where('slug', $coreSlug)->update(['type' => Catalog::TYPES[$coreSlug]]);
        }
    }

    /** Logos for every non-personal clinic (incl. Al Shifa and Nile Clinic). */
    private function clinicLogos(): void
    {
        foreach (Clinic::where('is_personal_practice', false)->get() as $clinic) {
            $path = "clinic-logos/{$clinic->slug}.svg";
            Storage::disk('public')->put($path, $this->images->clinicLogo($clinic->slug, $this->initials($clinic->name_en)));
            $clinic->forceFill(['logo_path' => $path])->save();
        }
    }

    private function avatar(DoctorProfile $doctor, bool $female): void
    {
        $path = "avatars/demo-{$doctor->id}.svg";
        Storage::disk('public')->put($path, $this->images->doctorAvatar($doctor->id, $female ? 'female' : 'male'));
        $doctor->forceFill(['avatar_path' => $path])->saveQuietly();
    }

    private function initials(string $nameEn): string
    {
        $words = array_values(array_filter(preg_split('/\s+/', $nameEn), fn ($w) => ! in_array(strtolower($w), ['al', 'of', 'the'], true)));

        return implode('', array_map(fn ($w) => mb_substr($w, 0, 1), array_slice($words, 0, 2)));
    }
}
