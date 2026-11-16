<?php

use App\Enums\BookingMode;
use App\Enums\DocumentType;
use App\Enums\VerificationStatus;
use App\Support\Database\Constraints;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('specialties', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->string('slug', 80)->unique();
            $table->string('name_ar', 100);
            $table->string('name_en', 100);
            $table->text('description_ar')->nullable();
            $table->text('description_en')->nullable();
            $table->string('icon', 50)->nullable();
            $table->boolean('is_active')->default(true);
            $table->boolean('is_general_practice')->default(false);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestampsTz();
            $table->index(['is_active', 'sort_order']);
        });

        Schema::create('patient_profiles', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->date('date_of_birth')->nullable();
            $table->string('gender', 10)->nullable();
            $table->foreignUlid('governorate_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignUlid('city_id')->nullable()->constrained()->nullOnDelete();
            $table->timestampsTz();
        });
        Constraints::in('patient_profiles', 'gender', ['male', 'female'], nullable: true);

        Schema::create('doctor_profiles', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('title_ar', 150)->nullable();
            $table->string('title_en', 150)->nullable();
            $table->text('bio_ar')->nullable();
            $table->text('bio_en')->nullable();
            $table->text('qualifications')->nullable();
            $table->unsignedSmallInteger('years_experience')->default(0);
            $table->string('gender', 10)->nullable();
            $table->string('avatar_path')->nullable();
            // Private: never serialized publicly.
            $table->string('license_number', 50)->nullable();
            $table->string('verification_status', 20)->default(VerificationStatus::Draft->value);
            $table->text('verification_notes')->nullable();
            $table->timestampTz('verification_submitted_at')->nullable();
            $table->timestampTz('verified_at')->nullable();
            $table->foreignUlid('verified_by')->nullable()->constrained('users')->nullOnDelete();
            $table->boolean('is_active')->default(true);
            // Booking preferences
            $table->boolean('accepts_bookings')->default(true);
            $table->string('booking_mode', 10)->default(BookingMode::Instant->value);
            $table->unsignedSmallInteger('min_cancellation_hours')->default(12);
            $table->unsignedInteger('lead_time_minutes')->default(60);
            $table->unsignedSmallInteger('horizon_days')->default(60);
            $table->unsignedSmallInteger('buffer_minutes')->default(0);
            $table->string('timezone', 50)->default('Africa/Cairo');
            // Denormalized for discovery/sorting; maintained by the application.
            $table->decimal('rating_avg', 3, 2)->default(0);
            $table->unsignedInteger('rating_count')->default(0);
            $table->decimal('min_price', 10, 2)->nullable();
            $table->timestampTz('next_available_at')->nullable();
            $table->text('search_text')->default('');
            $table->timestampsTz();
            $table->index(['verification_status', 'is_active']);
            $table->index('rating_avg');
            $table->index('min_price');
            $table->index('next_available_at');
        });
        Constraints::in('doctor_profiles', 'verification_status', VerificationStatus::values());
        Constraints::in('doctor_profiles', 'booking_mode', BookingMode::values());
        Constraints::in('doctor_profiles', 'gender', ['male', 'female'], nullable: true);
        Constraints::check('doctor_profiles', 'doctor_profiles_horizon_range', 'horizon_days BETWEEN 1 AND 365');
        Constraints::check('doctor_profiles', 'doctor_profiles_buffer_range', 'buffer_minutes <= 120');
        Constraints::check('doctor_profiles', 'doctor_profiles_rating_range', 'rating_avg BETWEEN 0 AND 5');
        Constraints::check('doctor_profiles', 'doctor_profiles_min_price_nonneg', 'min_price IS NULL OR min_price >= 0');
        DB::statement('CREATE INDEX doctor_profiles_search_text_trgm ON doctor_profiles USING gin (search_text gin_trgm_ops)');

        Schema::create('doctor_specialties', function (Blueprint $table) {
            $table->foreignUlid('doctor_profile_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('specialty_id')->constrained()->restrictOnDelete();
            $table->boolean('is_primary')->default(false);
            $table->primary(['doctor_profile_id', 'specialty_id']);
            $table->index('specialty_id');
        });
        DB::statement('CREATE UNIQUE INDEX doctor_specialties_one_primary ON doctor_specialties (doctor_profile_id) WHERE is_primary');

        Schema::create('doctor_documents', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('doctor_profile_id')->constrained()->cascadeOnDelete();
            $table->string('type', 20);
            $table->string('disk', 20);
            $table->string('path');
            $table->string('original_name', 255);
            $table->string('mime', 100);
            $table->unsignedInteger('size');
            $table->timestampsTz();
            $table->index('doctor_profile_id');
        });
        Constraints::in('doctor_documents', 'type', DocumentType::values());
    }

    public function down(): void
    {
        Schema::dropIfExists('doctor_documents');
        Schema::dropIfExists('doctor_specialties');
        Schema::dropIfExists('doctor_profiles');
        Schema::dropIfExists('patient_profiles');
        Schema::dropIfExists('specialties');
    }
};
