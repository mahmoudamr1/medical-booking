<?php

use App\Enums\UrgentStatus;
use App\Support\Database\Constraints;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Explicit opt-in. Being verified never makes a doctor a volunteer automatically.
        Schema::create('volunteer_profiles', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('doctor_profile_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('status', 20)->default('active');
            $table->unsignedSmallInteger('max_concurrent_requests')->default(1);
            $table->boolean('accepts_online')->default(true);
            $table->boolean('accepts_in_person')->default(false);
            $table->timestampTz('opted_in_at');
            $table->timestampTz('last_availability_update_at')->nullable();
            $table->timestampsTz();
        });
        Constraints::in('volunteer_profiles', 'status', ['active', 'inactive']);
        Constraints::check('volunteer_profiles', 'volunteer_profiles_max_range', 'max_concurrent_requests BETWEEN 1 AND 10');

        Schema::create('volunteer_specialties', function (Blueprint $table) {
            $table->foreignUlid('volunteer_profile_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('specialty_id')->constrained()->restrictOnDelete();
            $table->primary(['volunteer_profile_id', 'specialty_id']);
            $table->index('specialty_id');
        });

        Schema::create('volunteer_locations', function (Blueprint $table) {
            $table->id();
            $table->foreignUlid('volunteer_profile_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('governorate_id')->constrained()->restrictOnDelete();
            $table->foreignUlid('city_id')->nullable()->constrained()->restrictOnDelete();   // NULL = whole governorate
            $table->foreignUlid('area_id')->nullable()->constrained()->restrictOnDelete();
            $table->index(['governorate_id', 'city_id']);
        });

        // Time-bounded availability windows; availability is never open-ended.
        Schema::create('volunteer_availabilities', function (Blueprint $table) {
            $table->id();
            $table->foreignUlid('volunteer_profile_id')->constrained()->cascadeOnDelete();
            $table->timestampTz('starts_at');
            $table->timestampTz('ends_at');
            $table->string('mode', 10);
            $table->string('kind', 10);
            $table->timestampTz('created_at')->useCurrent();
            $table->index(['volunteer_profile_id', 'ends_at']);
            $table->index(['starts_at', 'ends_at']);
        });
        Constraints::in('volunteer_availabilities', 'mode', ['online', 'in_person', 'both']);
        Constraints::in('volunteer_availabilities', 'kind', ['now', 'tonight', 'scheduled']);
        Constraints::check('volunteer_availabilities', 'volunteer_availabilities_period',
            "ends_at > starts_at AND ends_at - starts_at <= interval '24 hours'");

        Schema::create('urgent_requests', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('patient_profile_id')->constrained()->restrictOnDelete();
            $table->foreignUlid('specialty_id')->nullable()->constrained()->nullOnDelete();
            $table->string('description', 1000);
            $table->string('consultation_type', 20);
            $table->foreignUlid('governorate_id')->constrained()->restrictOnDelete();
            $table->foreignUlid('city_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignUlid('area_id')->nullable()->constrained()->nullOnDelete();
            // Sensitive: revealed only to the accepted doctor; cleared when the request closes / after retention.
            $table->string('location_details', 500)->nullable();
            $table->string('contact_phone', 20)->nullable();
            $table->timestampTz('disclaimer_acknowledged_at');
            $table->foreignUlid('consent_id')->constrained('consents')->restrictOnDelete();
            $table->string('status', 20);
            $table->unsignedSmallInteger('current_tier')->default(0);
            $table->boolean('gp_disclosure')->default(false);
            $table->foreignUlid('accepted_doctor_profile_id')->nullable()->constrained('doctor_profiles')->nullOnDelete();
            $table->timestampTz('accepted_at')->nullable();
            $table->timestampTz('started_at')->nullable();
            $table->timestampTz('closed_at')->nullable();
            $table->string('close_reason', 255)->nullable();
            $table->timestampTz('expires_at');
            $table->timestampTz('flagged_at')->nullable();
            $table->foreignUlid('flagged_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('flag_reason', 500)->nullable();
            $table->timestampsTz();
            $table->index('status');
            $table->index(['patient_profile_id', 'created_at']);
            $table->index(['status', 'expires_at']);
        });
        Constraints::in('urgent_requests', 'status', UrgentStatus::values());
        Constraints::in('urgent_requests', 'consultation_type', ['online', 'in_person']);
        Constraints::check('urgent_requests', 'urgent_requests_tier_range', 'current_tier BETWEEN 0 AND 3');
        // A request is accepted/in progress/completed iff it has an accepted doctor.
        Constraints::check('urgent_requests', 'urgent_requests_acceptance_state',
            "(status IN ('accepted','in_progress','completed')) = (accepted_doctor_profile_id IS NOT NULL AND accepted_at IS NOT NULL)
             OR (status = 'cancelled' AND accepted_doctor_profile_id IS NOT NULL)");

        Schema::create('urgent_request_dispatches', function (Blueprint $table) {
            $table->id();
            $table->foreignUlid('urgent_request_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('doctor_profile_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('tier');
            $table->string('status', 20)->default('notified');
            $table->timestampTz('notified_at');
            $table->timestampTz('responded_at')->nullable();
            $table->timestampTz('viewed_at')->nullable();
            $table->unique(['urgent_request_id', 'doctor_profile_id']);
            $table->index(['doctor_profile_id', 'status']);
        });
        Constraints::in('urgent_request_dispatches', 'status', ['notified', 'declined', 'accepted', 'lost', 'expired']);
        // THE single-winner guarantee: at most one accepted dispatch per request.
        DB::statement("CREATE UNIQUE INDEX urgent_request_dispatches_one_winner ON urgent_request_dispatches (urgent_request_id) WHERE status = 'accepted'");
    }

    public function down(): void
    {
        Schema::dropIfExists('urgent_request_dispatches');
        Schema::dropIfExists('urgent_requests');
        Schema::dropIfExists('volunteer_availabilities');
        Schema::dropIfExists('volunteer_locations');
        Schema::dropIfExists('volunteer_specialties');
        Schema::dropIfExists('volunteer_profiles');
    }
};
