<?php

use App\Support\Database\Constraints;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reviews', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('appointment_id')->unique()->constrained()->cascadeOnDelete(); // one per appointment
            $table->foreignUlid('doctor_profile_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('patient_profile_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('rating');
            $table->text('comment')->nullable();
            $table->string('status', 20)->default('published');
            $table->foreignUlid('moderated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampTz('moderated_at')->nullable();
            $table->string('moderation_reason', 500)->nullable();
            $table->timestampsTz();
            $table->index(['doctor_profile_id', 'status', 'created_at']);
        });
        Constraints::check('reviews', 'reviews_rating_range', 'rating BETWEEN 1 AND 5');
        Constraints::in('reviews', 'status', ['published', 'hidden']);

        Schema::create('review_reports', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('review_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('reporter_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('reason', 500);
            $table->string('status', 20)->default('open');
            $table->foreignUlid('resolved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampTz('resolved_at')->nullable();
            $table->timestampsTz();
            $table->unique(['review_id', 'reporter_user_id']);
            $table->index('status');
        });
        Constraints::in('review_reports', 'status', ['open', 'resolved', 'dismissed']);
    }

    public function down(): void
    {
        Schema::dropIfExists('review_reports');
        Schema::dropIfExists('reviews');
    }
};
