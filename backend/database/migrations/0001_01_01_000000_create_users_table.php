<?php

use App\Enums\UserStatus;
use App\Support\Database\Constraints;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Extensions are created by a superuser in scripts/dev-services.sh / docker init.
        // IF NOT EXISTS keeps this a no-op there and makes managed databases work too.
        DB::statement('CREATE EXTENSION IF NOT EXISTS btree_gist');
        DB::statement('CREATE EXTENSION IF NOT EXISTS pg_trgm');

        Schema::create('users', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->string('name', 120);
            $table->string('email', 191)->unique();
            $table->string('phone', 20)->nullable();
            $table->string('locale', 2)->default('ar');
            $table->string('status', 20)->default(UserStatus::Active->value);
            $table->text('status_reason')->nullable();
            $table->timestampTz('email_verified_at')->nullable();
            $table->string('password');
            $table->timestampTz('last_login_at')->nullable();
            $table->rememberToken();
            $table->timestampsTz();
        });
        DB::statement('CREATE UNIQUE INDEX users_phone_unique ON users (phone) WHERE phone IS NOT NULL');
        Constraints::in('users', 'status', UserStatus::values());
        Constraints::in('users', 'locale', ['ar', 'en']);

        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestampTz('created_at')->nullable();
        });

        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignUlid('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sessions');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('users');
    }
};
