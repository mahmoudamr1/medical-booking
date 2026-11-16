<?php

namespace Database\Seeders\Support;

use App\Enums\RoleName;
use App\Models\Appointment;
use App\Models\City;
use App\Models\Clinic;
use App\Models\ClinicBranch;
use App\Models\DoctorProfile;
use App\Models\MedicalService;
use App\Models\PatientProfile;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

/**
 * Idempotent building blocks shared by the demo seeders: accounts, clinic branches and
 * appointments. Every method converges to the same rows when run again.
 */
final class DemoFactory
{
    /** PostgreSQL exclusion-constraint violation: the doctor's period is already booked. */
    private const PERIOD_TAKEN = '23P01';

    /**
     * Creates or refreshes a demo account: configured password, active and verified, with the given roles.
     *
     * @param  list<RoleName>  $roles
     */
    public static function user(string $email, string $name, array $roles): User
    {
        $user = User::firstOrNew(['email' => $email]);
        // Always (re)apply the configured password and an active, verified state so a reset is reliable.
        $user->fill(['name' => $name, 'password' => self::passwordFor($email), 'locale' => $user->locale ?? 'ar']);
        $user->forceFill(['status' => 'active', 'status_reason' => null, 'email_verified_at' => $user->email_verified_at ?? now()]);
        $user->save();
        foreach ($roles as $role) {
            $user->assignRole($role);
        }

        return $user;
    }

    /** Documented demo accounts have their own password; every supporting account shares one. */
    public static function passwordFor(string $email): string
    {
        foreach (config()->array('demo.accounts') as $account) {
            if ($account['email'] === $email) {
                return $account['password'];
            }
        }

        return config()->string('demo.support_password');
    }

    /**
     * Creates or updates a clinic branch (keyed by clinic + English name) and replaces its opening hours.
     *
     * @param  array{name_ar: string, name_en: string, address_ar: string, address_en: string, phone: string}  $details
     * @param  list<array{int, string, string}>  $hours  [day_of_week, opens_at, closes_at]
     */
    public static function branch(Clinic $clinic, string $citySlug, array $details, array $hours): ClinicBranch
    {
        $city = City::where('slug', $citySlug)->firstOrFail();
        $branch = ClinicBranch::updateOrCreate(
            ['clinic_id' => $clinic->id, 'name_en' => $details['name_en']],
            [...$details, 'governorate_id' => $city->governorate_id, 'city_id' => $city->id, 'is_active' => true],
        );

        $branch->hours()->delete();
        foreach ($hours as [$day, $opensAt, $closesAt]) {
            $branch->hours()->create(['day_of_week' => $day, 'opens_at' => $opensAt, 'closes_at' => $closesAt]);
        }

        return $branch;
    }

    /** An unsaved appointment for a service, booked by the patient themself unless stated otherwise. */
    public static function appointment(
        string $reference,
        DoctorProfile $doctor,
        PatientProfile $patient,
        MedicalService $service,
        CarbonImmutable $start,
        int $bufferMinutes = 0,
        ?User $bookedBy = null,
        string $via = 'patient',
    ): Appointment {
        $end = $start->addMinutes($service->duration_minutes);

        return new Appointment([
            'reference' => $reference, 'doctor_profile_id' => $doctor->id, 'patient_profile_id' => $patient->id,
            'medical_service_id' => $service->id, 'clinic_branch_id' => $service->clinic_branch_id, 'clinic_id' => $service->clinic_id,
            'consultation_type' => $service->consultation_type, 'starts_at' => $start, 'ends_at' => $end,
            'blocked_until' => $end->addMinutes($bufferMinutes),
            'price' => $service->price, 'booked_by_user_id' => $bookedBy->id ?? $patient->user_id, 'booked_via' => $via,
        ]);
    }

    /**
     * Saves an appointment with its status history (and optional extra rows) atomically.
     * Returns false, leaving the database untouched, when the doctor's period is already taken.
     *
     * @param  list<array<string, mixed>>  $histories
     * @param  (callable(Appointment): void)|null  $then  further rows that belong to the appointment
     */
    public static function save(Appointment $appointment, array $histories, ?callable $then = null): bool
    {
        try {
            DB::transaction(function () use ($appointment, $histories, $then) {
                $appointment->save();
                foreach ($histories as $history) {
                    $appointment->histories()->create($history);
                }
                if ($then !== null) {
                    $then($appointment);
                }
            });
        } catch (QueryException $e) {
            if ($e->getCode() !== self::PERIOD_TAKEN) {
                throw $e;
            }

            return false;
        }

        return true;
    }
}
