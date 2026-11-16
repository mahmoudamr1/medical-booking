<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /** All seeders are idempotent: re-running never duplicates data. */
    public function run(): void
    {
        $this->call([
            RolePermissionSeeder::class,
            GeographySeeder::class,
            SpecialtySeeder::class,
        ]);

        if (! app()->isProduction()) {
            $this->call(DemoSeeder::class);
        }
    }
}
