<?php

namespace App\Console\Commands;

use App\Models\ClinicBranch;
use App\Models\Specialty;
use App\Services\Search\ArabicNormalizer;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Performance dataset: N synthetic verified doctors (bulk inserts), spread over existing branches
 * and specialties, with services and weekly schedules. Development only — refuses in production.
 */
class SeedBulkDoctors extends Command
{
    protected $signature = 'demo:bulk-doctors {count=1000}';

    protected $description = 'Insert N synthetic verified doctors for performance measurement (non-production)';

    public function handle(): int
    {
        if (app()->isProduction()) {
            $this->error('Refusing to run in production.');

            return self::FAILURE;
        }

        $count = (int) $this->argument('count');
        $branches = ClinicBranch::all(['id', 'clinic_id'])->all();
        $specialties = Specialty::pluck('id')->all();
        if (! $branches || ! $specialties) {
            $this->error('Run the base seeders first (php artisan db:seed).');

            return self::FAILURE;
        }
        $password = Hash::make(Str::random(32));
        $patientRole = DB::table('roles')->where('name', 'patient')->value('id');
        $doctorRole = DB::table('roles')->where('name', 'doctor')->value('id');
        $first = ['Ahmed', 'Mona', 'Omar', 'Sara', 'Karim', 'Laila', 'Youssef', 'Nour', 'Hany', 'Dina'];
        $last = ['Hassan', 'Fathy', 'Saleh', 'Mostafa', 'Ibrahim', 'Adel', 'Samir', 'Farouk'];

        $bar = $this->output->createProgressBar($count);
        foreach (array_chunk(range(1, $count), 200) as $chunk) {
            DB::transaction(function () use ($chunk, $branches, $specialties, $password, $patientRole, $doctorRole, $first, $last, $bar) {
                $now = now();
                $users = $doctors = $roles = $specs = $affs = $services = $schedules = [];
                foreach ($chunk as $i) {
                    $userId = strtolower((string) Str::ulid());
                    $doctorId = strtolower((string) Str::ulid());
                    $name = 'Dr. '.$first[$i % 10].' '.$last[$i % 8].' '.$i;
                    $branch = $branches[$i % count($branches)];
                    $price = 150 + ($i % 20) * 25;
                    $users[] = ['id' => $userId, 'name' => $name, 'email' => "bulk.doctor.{$i}.".Str::lower(Str::random(4)).'@example.test',
                        'password' => $password, 'status' => 'active', 'locale' => 'ar', 'email_verified_at' => $now, 'created_at' => $now, 'updated_at' => $now];
                    $doctors[] = ['id' => $doctorId, 'user_id' => $userId, 'title_en' => 'Specialist', 'title_ar' => 'أخصائي',
                        'years_experience' => $i % 30, 'verification_status' => 'approved', 'verified_at' => $now, 'is_active' => true,
                        'accepts_bookings' => true, 'booking_mode' => 'instant', 'min_cancellation_hours' => 12, 'lead_time_minutes' => 60,
                        'horizon_days' => 30, 'buffer_minutes' => 0, 'timezone' => 'Africa/Cairo', 'rating_avg' => round(($i % 50) / 10, 2),
                        'rating_count' => $i % 40, 'min_price' => $price, 'search_text' => ArabicNormalizer::normalize($name.' Specialist أخصائي'),
                        'next_available_at' => $now->copy()->addHours($i % 72), 'created_at' => $now, 'updated_at' => $now];
                    $roles[] = ['user_id' => $userId, 'role_id' => $patientRole, 'created_at' => $now];
                    $roles[] = ['user_id' => $userId, 'role_id' => $doctorRole, 'created_at' => $now];
                    $specs[] = ['doctor_profile_id' => $doctorId, 'specialty_id' => $specialties[$i % count($specialties)], 'is_primary' => true];
                    $affs[] = ['id' => strtolower((string) Str::ulid()), 'doctor_profile_id' => $doctorId, 'clinic_branch_id' => $branch->id,
                        'clinic_id' => $branch->clinic_id, 'status' => 'active', 'created_at' => $now, 'updated_at' => $now];
                    $services[] = ['id' => strtolower((string) Str::ulid()), 'doctor_profile_id' => $doctorId, 'clinic_branch_id' => $branch->id,
                        'clinic_id' => $branch->clinic_id, 'name_ar' => 'كشف', 'name_en' => 'Consultation', 'consultation_type' => 'in_person',
                        'duration_minutes' => 20, 'price' => $price, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now];
                    foreach ([0, 1, 2, 3, 6] as $day) {
                        $schedules[] = ['id' => strtolower((string) Str::ulid()), 'doctor_profile_id' => $doctorId, 'clinic_branch_id' => $branch->id,
                            'day_of_week' => $day, 'starts_at' => '10:00', 'ends_at' => '16:00', 'is_active' => true, 'created_at' => $now, 'updated_at' => $now];
                    }
                }
                DB::table('users')->insert($users);
                DB::table('doctor_profiles')->insert($doctors);
                DB::table('user_roles')->insert($roles);
                DB::table('doctor_specialties')->insert($specs);
                DB::table('doctor_branch_affiliations')->insert($affs);
                DB::table('medical_services')->insert($services);
                DB::table('doctor_schedules')->insert($schedules);
                $bar->advance(count($chunk));
            });
        }
        $bar->finish();
        DB::statement('ANALYZE');
        $this->newLine();
        $this->info("Inserted {$count} doctors.");

        return self::SUCCESS;
    }
}
