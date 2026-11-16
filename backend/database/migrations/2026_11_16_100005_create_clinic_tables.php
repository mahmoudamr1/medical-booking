<?php

use App\Enums\AffiliationStatus;
use App\Enums\ClinicRole;
use App\Enums\ClinicStatus;
use App\Enums\ConsultationType;
use App\Enums\MembershipStatus;
use App\Support\Database\Constraints;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clinics', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('owner_user_id')->constrained('users')->restrictOnDelete();
            $table->string('slug', 120)->unique();
            $table->string('name_ar', 150);
            $table->string('name_en', 150);
            $table->text('description_ar')->nullable();
            $table->text('description_en')->nullable();
            $table->string('phone', 20)->nullable();
            $table->string('email', 191)->nullable();
            $table->string('logo_path')->nullable();
            $table->boolean('is_personal_practice')->default(false);
            $table->string('status', 20)->default(ClinicStatus::Active->value);
            $table->timestampsTz();
            $table->index('owner_user_id');
        });
        Constraints::in('clinics', 'status', ClinicStatus::values());

        Schema::create('clinic_memberships', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('clinic_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('user_id')->constrained()->cascadeOnDelete();
            $table->string('role', 20);
            $table->string('status', 20)->default(MembershipStatus::Active->value);
            $table->foreignUlid('invited_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampTz('joined_at')->nullable();
            $table->timestampsTz();
            $table->unique(['clinic_id', 'user_id']);
            $table->index('user_id');
        });
        Constraints::in('clinic_memberships', 'role', ClinicRole::values());
        Constraints::in('clinic_memberships', 'status', MembershipStatus::values());

        Schema::create('clinic_branches', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('clinic_id')->constrained()->cascadeOnDelete();
            $table->string('name_ar', 150);
            $table->string('name_en', 150);
            $table->foreignUlid('governorate_id')->constrained()->restrictOnDelete();
            $table->foreignUlid('city_id')->constrained()->restrictOnDelete();
            $table->foreignUlid('area_id')->nullable()->constrained()->nullOnDelete();
            $table->string('address_ar', 255);
            $table->string('address_en', 255)->nullable();
            $table->string('phone', 20)->nullable();
            $table->decimal('latitude', 9, 6)->nullable();
            $table->decimal('longitude', 9, 6)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestampsTz();
            $table->index('clinic_id');
            $table->index(['governorate_id', 'city_id']);
        });

        Schema::create('branch_hours', function (Blueprint $table) {
            $table->id();
            $table->foreignUlid('clinic_branch_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('day_of_week');
            $table->time('opens_at');
            $table->time('closes_at');
            $table->unique(['clinic_branch_id', 'day_of_week', 'opens_at']);
        });
        Constraints::check('branch_hours', 'branch_hours_day_range', 'day_of_week BETWEEN 0 AND 6');
        Constraints::check('branch_hours', 'branch_hours_period', 'closes_at > opens_at');

        Schema::create('doctor_branch_affiliations', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('doctor_profile_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('clinic_branch_id')->constrained()->cascadeOnDelete();
            // Denormalized owning tenant for scoped queries.
            $table->foreignUlid('clinic_id')->constrained()->cascadeOnDelete();
            $table->string('status', 20)->default(AffiliationStatus::Active->value);
            $table->timestampsTz();
            $table->unique(['doctor_profile_id', 'clinic_branch_id']);
            $table->index('clinic_id');
        });
        Constraints::in('doctor_branch_affiliations', 'status', AffiliationStatus::values());

        Schema::create('medical_services', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('doctor_profile_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('clinic_branch_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignUlid('clinic_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('name_ar', 150);
            $table->string('name_en', 150);
            $table->string('consultation_type', 20);
            $table->unsignedSmallInteger('duration_minutes');
            $table->decimal('price', 10, 2);
            $table->boolean('is_active')->default(true);
            $table->timestampsTz();
            $table->index(['doctor_profile_id', 'is_active']);
            $table->index('clinic_id');
        });
        Constraints::in('medical_services', 'consultation_type', ConsultationType::values());
        Constraints::check('medical_services', 'medical_services_duration_range', 'duration_minutes BETWEEN 5 AND 240');
        Constraints::check('medical_services', 'medical_services_price_nonneg', 'price >= 0');
        Constraints::check('medical_services', 'medical_services_branch_clinic',
            '(clinic_branch_id IS NULL) = (clinic_id IS NULL)');
        Constraints::check('medical_services', 'medical_services_in_person_has_branch',
            "consultation_type = 'online' OR clinic_branch_id IS NOT NULL");
    }

    public function down(): void
    {
        Schema::dropIfExists('medical_services');
        Schema::dropIfExists('doctor_branch_affiliations');
        Schema::dropIfExists('branch_hours');
        Schema::dropIfExists('clinic_branches');
        Schema::dropIfExists('clinic_memberships');
        Schema::dropIfExists('clinics');
    }
};
