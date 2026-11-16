<?php

use App\Enums\UrgentSeverity;
use App\Support\Database\Constraints;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Spec 002 (live urgent consultation): severity, directed requests, outcome note, and the
 * patient ↔ accepted-doctor message thread. The not-an-ambulance disclaimer is no longer part
 * of the flow, so its acknowledgment column becomes nullable (historic values are kept).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('urgent_requests', function (Blueprint $table) {
            $table->string('severity', 10)->default(UrgentSeverity::Urgent->value)->after('status');
            $table->foreignUlid('preferred_doctor_profile_id')->nullable()->after('severity')
                ->constrained('doctor_profiles')->nullOnDelete();
            $table->text('outcome_note')->nullable();
            // Per-side read markers: id of the last message each participant has fetched.
            $table->unsignedBigInteger('patient_read_message_id')->nullable();
            $table->unsignedBigInteger('doctor_read_message_id')->nullable();
            $table->timestampTz('disclaimer_acknowledged_at')->nullable()->change();
            $table->index('preferred_doctor_profile_id');
            $table->index(['status', 'severity', 'created_at']);
        });
        Constraints::in('urgent_requests', 'severity', UrgentSeverity::values());
        Constraints::check('urgent_requests', 'urgent_requests_outcome_note_length', 'char_length(outcome_note) <= 2000');

        Schema::create('urgent_request_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignUlid('urgent_request_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('sender_user_id')->constrained('users')->restrictOnDelete();
            $table->string('body', 1000);
            $table->timestampTz('created_at')->useCurrent();
            $table->index(['urgent_request_id', 'id']);
        });
        Constraints::check('urgent_request_messages', 'urgent_request_messages_body_not_blank', "btrim(body) <> ''");
    }

    public function down(): void
    {
        Schema::dropIfExists('urgent_request_messages');
        Schema::table('urgent_requests', function (Blueprint $table) {
            $table->dropIndex(['status', 'severity', 'created_at']);
            $table->dropConstrainedForeignId('preferred_doctor_profile_id');
            $table->dropColumn(['severity', 'outcome_note', 'patient_read_message_id', 'doctor_read_message_id']);
        });
    }
};
