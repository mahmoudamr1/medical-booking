<?php

use App\Support\Database\Constraints;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignUlid('actor_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action', 100);
            $table->string('subject_type', 100)->nullable();
            $table->string('subject_id', 26)->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent', 500)->nullable();
            $table->jsonb('changes')->nullable();
            $table->timestampTz('created_at')->useCurrent();
            $table->index(['subject_type', 'subject_id']);
            $table->index(['actor_user_id', 'created_at']);
            $table->index(['action', 'created_at']);
        });

        Schema::create('platform_settings', function (Blueprint $table) {
            $table->string('key', 100)->primary();
            $table->jsonb('value');
            $table->foreignUlid('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampsTz();
        });

        Schema::create('consents', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('user_id')->constrained()->cascadeOnDelete();
            $table->string('type', 50);
            $table->boolean('granted');
            $table->string('version', 20)->default('1');
            $table->timestampTz('granted_at')->nullable();
            $table->timestampTz('revoked_at')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->timestampsTz();
            $table->index(['user_id', 'type']);
        });
        Constraints::in('consents', 'type', ['terms', 'urgent_data_sharing', 'marketing', 'medical_data_processing']);
    }

    public function down(): void
    {
        Schema::dropIfExists('consents');
        Schema::dropIfExists('platform_settings');
        Schema::dropIfExists('audit_logs');
    }
};
