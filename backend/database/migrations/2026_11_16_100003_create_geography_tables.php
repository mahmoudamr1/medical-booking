<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('governorates', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->string('slug', 80)->unique();
            $table->string('name_ar', 100);
            $table->string('name_en', 100);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestampsTz();
        });

        Schema::create('cities', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('governorate_id')->constrained()->restrictOnDelete();
            $table->string('slug', 80);
            $table->string('name_ar', 100);
            $table->string('name_en', 100);
            $table->timestampsTz();
            $table->unique(['governorate_id', 'slug']);
        });

        Schema::create('areas', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('city_id')->constrained()->restrictOnDelete();
            $table->string('slug', 80);
            $table->string('name_ar', 100);
            $table->string('name_en', 100);
            $table->timestampsTz();
            $table->unique(['city_id', 'slug']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('areas');
        Schema::dropIfExists('cities');
        Schema::dropIfExists('governorates');
    }
};
