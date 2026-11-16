<?php

namespace App\Console\Commands;

use Database\Seeders\DemoSeeder;
use Database\Seeders\GeographySeeder;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\SpecialtySeeder;
use Illuminate\Console\Command;

/**
 * Creates or updates all development demo accounts and their data. Idempotent.
 *   php artisan demo:seed           # create/update (safe to repeat)
 *   php artisan demo:seed --fresh   # drop everything, migrate, seed (full local reset)
 */
class DemoSeed extends Command
{
    protected $signature = 'demo:seed {--fresh : Drop all tables and rebuild the local demo environment}';

    protected $description = 'Create or update development demo accounts and demo data (never in production)';

    public function handle(): int
    {
        if (app()->isProduction()) {
            $this->error('Refusing to create demo accounts in production (APP_ENV=production).');

            return self::FAILURE;
        }

        if ($this->option('fresh')) {
            $this->call('migrate:fresh', ['--force' => true]);
        } else {
            $this->call('migrate', ['--force' => true]);
        }

        foreach ([RolePermissionSeeder::class, GeographySeeder::class, SpecialtySeeder::class, DemoSeeder::class] as $seeder) {
            $this->call('db:seed', ['--class' => $seeder, '--force' => true]);
        }
        $this->call('cache:clear');

        $rows = collect(config()->array('demo.accounts'))->map(fn ($a, $key) => [$key, $a['email'], $a['password'], $a['dashboard']])->values()->all();
        $this->table(['Role', 'Email', 'Password (dev only)', 'Dashboard'], $rows);
        $this->line('Supporting accounts (patient2, other doctors, clinic2.owner) use: '.config('demo.support_password'));

        return self::SUCCESS;
    }
}
