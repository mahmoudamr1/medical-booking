<?php

use App\Enums\ActorRole;
use App\Enums\AppointmentStatus;
use App\Enums\ConsultationType;
use App\Support\Database\Constraints;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Weekly recurring working windows, per doctor and branch (NULL branch = online consultations).
        Schema::create('doctor_schedules', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('doctor_profile_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('clinic_branch_id')->nullable()->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('day_of_week'); // 0 = Sunday … 6 = Saturday (doctor's timezone)
            $table->time('starts_at');
            $table->time('ends_at');
            $table->boolean('is_active')->default(true);
            $table->timestampsTz();
            $table->index(['doctor_profile_id', 'day_of_week']);
        });
        Constraints::check('doctor_schedules', 'doctor_schedules_day_range', 'day_of_week BETWEEN 0 AND 6');
        Constraints::check('doctor_schedules', 'doctor_schedules_period', 'ends_at > starts_at');

        Schema::create('schedule_breaks', function (Blueprint $table) {
            $table->id();
            $table->foreignUlid('doctor_schedule_id')->constrained()->cascadeOnDelete();
            $table->time('starts_at');
            $table->time('ends_at');
        });
        Constraints::check('schedule_breaks', 'schedule_breaks_period', 'ends_at > starts_at');

        // Date-specific deviations: closed days/holidays, or custom hours replacing the weekly rule.
        Schema::create('schedule_exceptions', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('doctor_profile_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('clinic_branch_id')->nullable()->constrained()->cascadeOnDelete(); // NULL = all locations
            $table->date('date');
            $table->string('type', 20);
            $table->time('starts_at')->nullable();
            $table->time('ends_at')->nullable();
            $table->string('reason', 255)->nullable();
            $table->timestampsTz();
            $table->index(['doctor_profile_id', 'date']);
        });
        Constraints::in('schedule_exceptions', 'type', ['closed', 'custom_hours']);
        Constraints::check('schedule_exceptions', 'schedule_exceptions_custom_hours',
            "type = 'closed' OR (starts_at IS NOT NULL AND ends_at IS NOT NULL AND ends_at > starts_at)");

        Schema::create('appointments', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->string('reference', 12)->unique();
            $table->foreignUlid('doctor_profile_id')->constrained()->restrictOnDelete();
            $table->foreignUlid('patient_profile_id')->constrained()->restrictOnDelete();
            $table->foreignUlid('medical_service_id')->constrained()->restrictOnDelete();
            $table->foreignUlid('clinic_branch_id')->nullable()->constrained()->restrictOnDelete();
            $table->foreignUlid('clinic_id')->nullable()->constrained()->restrictOnDelete(); // tenant
            $table->string('consultation_type', 20);
            $table->timestampTz('starts_at');
            $table->timestampTz('ends_at');
            // ends_at + doctor's buffer, snapshotted at booking time; the blocked period is [starts_at, blocked_until).
            $table->timestampTz('blocked_until');
            $table->decimal('price', 10, 2);
            $table->string('status', 30);
            $table->timestampTz('hold_expires_at')->nullable();
            $table->foreignUlid('booked_by_user_id')->constrained('users')->restrictOnDelete();
            $table->string('booked_via', 20);
            $table->text('patient_notes')->nullable();
            $table->foreignUlid('cancelled_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('cancellation_reason', 500)->nullable();
            $table->timestampTz('cancelled_at')->nullable();
            $table->ulid('rescheduled_from_id')->nullable(); // self-FK added after the PK exists (below)
            $table->timestampTz('confirmed_at')->nullable();
            $table->timestampTz('completed_at')->nullable();
            $table->timestampTz('reminded_at')->nullable();
            $table->timestampsTz();

            $table->index(['doctor_profile_id', 'starts_at']);
            $table->index(['patient_profile_id', 'starts_at']);
            $table->index(['clinic_id', 'starts_at']);
            $table->index(['status', 'hold_expires_at']);
            $table->index(['status', 'starts_at']);
        });
        Schema::table('appointments', function (Blueprint $table) {
            $table->foreign('rescheduled_from_id')->references('id')->on('appointments')->nullOnDelete();
        });
        Constraints::in('appointments', 'status', AppointmentStatus::values());
        Constraints::in('appointments', 'consultation_type', ConsultationType::values());
        Constraints::in('appointments', 'booked_via', ['patient', 'clinic_staff', 'admin']);
        Constraints::check('appointments', 'appointments_period', 'ends_at > starts_at AND blocked_until >= ends_at');
        Constraints::check('appointments', 'appointments_price_nonneg', 'price >= 0');
        Constraints::check('appointments', 'appointments_pending_has_hold',
            "status <> 'pending_confirmation' OR hold_expires_at IS NOT NULL");
        Constraints::check('appointments', 'appointments_cancel_recorded',
            "status NOT LIKE 'cancelled_by_%' OR cancelled_at IS NOT NULL");

        // THE double-booking guarantee: no two blocking appointments of the same doctor may overlap.
        // Half-open ranges, so 10:00-10:20 and 10:20-10:40 do not conflict.
        $blocking = implode(',', array_map(fn ($s) => "'{$s}'", AppointmentStatus::BLOCKING));
        DB::statement("ALTER TABLE appointments ADD CONSTRAINT appointments_no_doctor_overlap
            EXCLUDE USING gist (
                doctor_profile_id WITH =,
                tstzrange(starts_at, blocked_until, '[)') WITH &&
            ) WHERE (status IN ({$blocking}))");

        Schema::create('appointment_status_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignUlid('appointment_id')->constrained()->cascadeOnDelete();
            $table->string('from_status', 30)->nullable();
            $table->string('to_status', 30);
            $table->foreignUlid('actor_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('actor_role', 20);
            $table->string('reason', 500)->nullable();
            $table->jsonb('metadata')->nullable();
            $table->timestampTz('created_at')->useCurrent();
            $table->index(['appointment_id', 'created_at']);
        });
        Constraints::in('appointment_status_histories', 'actor_role', ActorRole::values());
        Constraints::in('appointment_status_histories', 'to_status', AppointmentStatus::values());
    }

    public function down(): void
    {
        Schema::dropIfExists('appointment_status_histories');
        Schema::dropIfExists('appointments');
        Schema::dropIfExists('schedule_exceptions');
        Schema::dropIfExists('schedule_breaks');
        Schema::dropIfExists('doctor_schedules');
    }
};
