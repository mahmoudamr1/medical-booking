<?php

use App\Support\Database\Constraints;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clinics', function (Blueprint $table) {
            // Organization kind for discovery: clinic | hospital | medical_center.
            $table->string('type', 20)->default('clinic')->after('slug');
            $table->index(['status', 'type']);
        });
        Constraints::in('clinics', 'type', ['clinic', 'hospital', 'medical_center']);
    }

    public function down(): void
    {
        Schema::table('clinics', function (Blueprint $table) {
            $table->dropIndex(['status', 'type']);
            $table->dropColumn('type');
        });
    }
};
