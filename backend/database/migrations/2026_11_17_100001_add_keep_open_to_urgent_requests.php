<?php

use App\Support\Database\Constraints;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Spec 002 US6 (keep the request open when no doctor is available): a `waiting` status and the
 * bounded deadline until which a request is kept open (stored, so settings changes never move it).
 */
return new class extends Migration
{
    private const STATUSES_BEFORE = ['created', 'searching', 'notifying', 'accepted', 'in_progress', 'completed', 'cancelled', 'unmatched', 'expired'];

    public function up(): void
    {
        Schema::table('urgent_requests', function (Blueprint $table) {
            $table->timestampTz('keep_open_until')->nullable()->after('expires_at');
        });
        DB::statement('ALTER TABLE urgent_requests DROP CONSTRAINT urgent_requests_status_in');
        Constraints::in('urgent_requests', 'status', [...self::STATUSES_BEFORE, 'waiting']);
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE urgent_requests DROP CONSTRAINT urgent_requests_status_in');
        Constraints::in('urgent_requests', 'status', self::STATUSES_BEFORE);
        Schema::table('urgent_requests', function (Blueprint $table) {
            $table->dropColumn('keep_open_until');
        });
    }
};
