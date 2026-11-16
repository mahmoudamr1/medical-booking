<?php

namespace Database\Seeders;

use App\Actions\Clinics\CreateClinic;
use App\Enums\ClinicRole;
use App\Enums\ConsultationType;
use App\Enums\RoleName;
use App\Enums\VerificationStatus;
use App\Models\Clinic;
use App\Models\ClinicBranch;
use App\Models\ClinicMembership;
use App\Models\DoctorBranchAffiliation;
use App\Models\DoctorProfile;
use App\Models\DoctorSchedule;
use App\Models\MedicalService;
use App\Models\PatientProfile;
use App\Models\Specialty;
use App\Models\User;
use App\Services\Scheduling\AvailabilityService;
use Database\Seeders\Support\DemoFactory;
use Illuminate\Database\Seeder;
use RuntimeException;

/**
 * Development/demo data. 100% synthetic (example.test addresses, fictional names).
 * Idempotent: keyed by email / slug, so re-running updates instead of duplicating.
 * Passwords come from config/demo.php (generated, development only; see docs/DEMO-ACCOUNTS.md).
 * Refuses to run in production.
 */
class DemoSeeder extends Seeder
{
    /** email => [name, title_ar, title_en, specialty, years, city slug, price, duration, verification] */
    private const DOCTORS = [
        'dr.karim@example.test' => ['د. كريم منصور', 'استشاري أمراض القلب', 'Consultant Cardiologist', 'cardiology', 18, 'nasr-city', 500, 20, VerificationStatus::Approved],
        'dr.salma@example.test' => ['د. سلمى عادل', 'أخصائية الجلدية', 'Dermatology Specialist', 'dermatology', 9, 'heliopolis', 350, 15, VerificationStatus::Approved],
        'dr.omar@example.test' => ['د. عمر حسني', 'استشاري طب الأطفال', 'Consultant Pediatrician', 'pediatrics', 14, 'maadi', 400, 20, VerificationStatus::Approved],
        'dr.nour@example.test' => ['د. نور الهدى سامي', 'أخصائية طب العيون', 'Ophthalmology Specialist', 'ophthalmology', 7, 'dokki', 300, 15, VerificationStatus::Approved],
        'dr.youssef@example.test' => ['د. يوسف شريف', 'استشاري العظام', 'Consultant Orthopedic Surgeon', 'orthopedics', 20, 'smouha', 450, 30, VerificationStatus::Approved],
        'dr.mona@example.test' => ['د. منى فاروق', 'ممارس عام', 'General Practitioner', 'general-practice', 5, 'nasr-city', 200, 15, VerificationStatus::Approved],
        'dr.hany@example.test' => ['د. هاني رأفت', 'أخصائي الباطنة', 'Internal Medicine Specialist', 'internal-medicine', 11, 'mohandessin', 350, 20, VerificationStatus::Approved],
        'dr.volunteer@example.test' => ['د. ليلى حمدي', 'ممارس عام - طبيبة متطوعة', 'General Practitioner (volunteer)', 'general-practice', 8, 'nasr-city', 250, 15, VerificationStatus::Approved],
        'dr.pending@example.test' => ['د. طارق جمال', 'أخصائي الأنف والأذن', 'ENT Specialist', 'ent', 4, 'heliopolis', 300, 20, VerificationStatus::Pending],
        'dr.pending2@example.test' => ['د. رانيا فؤاد', 'أخصائية المسالك البولية', 'Urology Specialist', 'urology', 6, 'dokki', 320, 20, VerificationStatus::Pending],
    ];

    /** Branch opening hours: Sat–Thu 09:00–23:00, Friday closed. */
    private const BRANCH_HOURS = [[6, '09:00', '23:00'], [0, '09:00', '23:00'], [1, '09:00', '23:00'], [2, '09:00', '23:00'], [3, '09:00', '23:00'], [4, '09:00', '23:00']];

    public function run(): void
    {
        if (app()->isProduction()) {
            throw new RuntimeException('Demo data must never be seeded in production.');
        }

        $admin = DemoFactory::user('admin@example.test', 'مدير المنصة', [RoleName::Admin]);
        $patient = DemoFactory::user('patient@example.test', 'أحمد التجريبي', [RoleName::Patient]);
        PatientProfile::firstOrCreate(['user_id' => $patient->id]);
        $patient2 = DemoFactory::user('patient2@example.test', 'سارة التجريبية', [RoleName::Patient]);
        PatientProfile::firstOrCreate(['user_id' => $patient2->id]);

        $branches = $this->clinics();
        foreach (self::DOCTORS as $email => $definition) {
            $this->doctor($email, $definition, $branches, $admin);
        }

        $this->call(DemoShowcaseSeeder::class);
        $this->call(DemoActivitySeeder::class);

        $availability = app(AvailabilityService::class);
        DoctorProfile::with('user')->get()->each(fn (DoctorProfile $d) => $availability->refreshNextAvailable($d));
    }

    /**
     * A multi-branch clinic organization with staff, plus a second, unrelated clinic
     * (used to demonstrate tenant isolation).
     *
     * @return array<string, ClinicBranch> city slug => branch
     */
    private function clinics(): array
    {
        $owner = DemoFactory::user('clinic.owner@example.test', 'مالك عيادة الشفاء', [RoleName::Patient]);
        $clinic = Clinic::where('slug', 'al-shifa-medical-center')->first()
            ?? app(CreateClinic::class)->handle($owner, ['name_ar' => 'مركز الشفاء الطبي', 'name_en' => 'Al Shifa Medical Center']);
        $clinic->update(['slug' => 'al-shifa-medical-center', 'phone' => '0220000001', 'email' => 'info@al-shifa.example.test',
            'description_ar' => 'مركز طبي متعدد التخصصات (بيانات تجريبية)', 'description_en' => 'Multi-specialty medical center (demo data)']);
        $receptionist = DemoFactory::user('reception@example.test', 'موظفة الاستقبال', [RoleName::Patient]);
        ClinicMembership::updateOrCreate(['clinic_id' => $clinic->id, 'user_id' => $receptionist->id],
            ['role' => ClinicRole::Receptionist, 'status' => 'active', 'joined_at' => now()]);

        $branches = [
            'nasr-city' => $this->branch($clinic, 'nasr-city', 'فرع مدينة نصر', 'Nasr City Branch', 'شارع عباس العقاد', 'Abbas El Akkad St.'),
            'heliopolis' => $this->branch($clinic, 'heliopolis', 'فرع مصر الجديدة', 'Heliopolis Branch', 'ميدان روكسي', 'Roxy Square'),
        ];

        $owner2 = DemoFactory::user('clinic2.owner@example.test', 'مالك عيادة النيل', [RoleName::Patient]);
        $clinic2 = Clinic::where('slug', 'nile-clinic')->first()
            ?? app(CreateClinic::class)->handle($owner2, ['name_ar' => 'عيادة النيل', 'name_en' => 'Nile Clinic']);
        $clinic2->update(['slug' => 'nile-clinic']);
        $branches['dokki'] = $this->branch($clinic2, 'dokki', 'فرع الدقي', 'Dokki Branch', 'شارع التحرير', 'Tahrir St.');

        return $branches;
    }

    /**
     * @param  array{string, string, string, string, int, string, int, int, VerificationStatus}  $definition
     * @param  array<string, ClinicBranch>  $branches
     */
    private function doctor(string $email, array $definition, array $branches, User $admin): void
    {
        [$name, $titleAr, $titleEn, $specSlug, $years, $citySlug, $price, $duration, $status] = $definition;
        $approved = $status === VerificationStatus::Approved;

        $user = DemoFactory::user($email, $name, [RoleName::Patient, RoleName::Doctor]);
        PatientProfile::firstOrCreate(['user_id' => $user->id]);
        $doctor = DoctorProfile::firstOrNew(['user_id' => $user->id]);
        $doctor->fill([
            'title_ar' => $titleAr, 'title_en' => $titleEn, 'years_experience' => $years,
            'bio_ar' => "{$titleAr} بخبرة {$years} عاماً. (ملف تجريبي)",
            'bio_en' => "{$titleEn} with {$years} years of experience. (demo profile)",
            'qualifications' => 'MBBCh (synthetic)', 'license_number' => 'DEMO-'.substr(md5($email), 0, 8),
            'lead_time_minutes' => 30, 'horizon_days' => 30,
            'booking_mode' => $email === 'dr.omar@example.test' ? 'manual' : 'instant',
        ]);
        $doctor->verification_status = $status;
        $doctor->verified_at = $approved ? now() : null;
        $doctor->verified_by = $approved ? $admin->id : null;
        $doctor->verification_submitted_at = now();
        $doctor->save();

        $specialty = Specialty::where('slug', $specSlug)->firstOrFail();
        $doctor->specialties()->syncWithoutDetaching([$specialty->id => ['is_primary' => true]]);

        $branch = $branches[$citySlug] ?? $this->personalPractice($user, $citySlug);
        DoctorBranchAffiliation::updateOrCreate(
            ['doctor_profile_id' => $doctor->id, 'clinic_branch_id' => $branch->id],
            ['clinic_id' => $branch->clinic_id, 'status' => 'active'],
        );
        MedicalService::updateOrCreate(
            ['doctor_profile_id' => $doctor->id, 'clinic_branch_id' => $branch->id, 'consultation_type' => ConsultationType::InPerson],
            ['clinic_id' => $branch->clinic_id, 'name_ar' => 'كشف بالعيادة', 'name_en' => 'Clinic consultation',
                'duration_minutes' => $duration, 'price' => $price, 'is_active' => true],
        );
        MedicalService::updateOrCreate(
            ['doctor_profile_id' => $doctor->id, 'clinic_branch_id' => null, 'consultation_type' => ConsultationType::Online],
            ['name_ar' => 'استشارة أونلاين', 'name_en' => 'Online consultation',
                'duration_minutes' => 15, 'price' => (int) round($price * 0.7), 'is_active' => true],
        );
        $this->schedule($doctor, $branch);
    }

    /** Sat–Thu clinic hours with a break, plus online evenings. Replaced on every run (idempotent). */
    private function schedule(DoctorProfile $doctor, ClinicBranch $branch): void
    {
        DoctorSchedule::where('doctor_profile_id', $doctor->id)->delete();
        foreach ([6, 0, 1, 2, 3, 4] as $day) { // Friday (5) off
            $clinic = DoctorSchedule::create(['doctor_profile_id' => $doctor->id, 'clinic_branch_id' => $branch->id,
                'day_of_week' => $day, 'starts_at' => '10:00', 'ends_at' => '15:00']);
            $clinic->breaks()->create(['starts_at' => '12:30', 'ends_at' => '13:00']);
            DoctorSchedule::create(['doctor_profile_id' => $doctor->id, 'clinic_branch_id' => null,
                'day_of_week' => $day, 'starts_at' => '19:00', 'ends_at' => '22:00']);
        }
    }

    private function branch(Clinic $clinic, string $citySlug, string $nameAr, string $nameEn, string $addrAr, string $addrEn): ClinicBranch
    {
        return DemoFactory::branch($clinic, $citySlug, [
            'name_ar' => $nameAr, 'name_en' => $nameEn, 'address_ar' => $addrAr, 'address_en' => $addrEn, 'phone' => '0220000099',
        ], self::BRANCH_HOURS);
    }

    /** Independent doctors practice through a personal clinic with one branch. */
    private function personalPractice(User $doctorUser, string $citySlug): ClinicBranch
    {
        $clinic = Clinic::where('owner_user_id', $doctorUser->id)->where('is_personal_practice', true)->first()
            ?? app(CreateClinic::class)->handle($doctorUser, [
                'name_ar' => 'عيادة '.$doctorUser->name, 'name_en' => 'Private practice',
            ], personalPractice: true);

        return $this->branch($clinic, $citySlug, 'العيادة الخاصة', 'Private clinic', 'عنوان تجريبي', 'Demo address');
    }
}
