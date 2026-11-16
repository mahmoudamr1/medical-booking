<?php

namespace Tests\Concurrency;

use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Process;

/**
 * Concurrency tests need COMMITTED data visible to other processes, so they cannot use the
 * RefreshDatabase transaction wrapper. Each test starts from a freshly migrated schema and
 * truncates afterwards so later suites see a clean database.
 */
abstract class ConcurrencyTestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Artisan::call('migrate:fresh', ['--force' => true]);
        $this->seed(RolePermissionSeeder::class);
    }

    protected function tearDown(): void
    {
        $tables = collect(DB::select("select tablename from pg_tables where schemaname = 'public' and tablename <> 'migrations'"))
            ->pluck('tablename')->implode(', ');
        DB::statement("TRUNCATE {$tables} RESTART IDENTITY CASCADE");
        parent::tearDown();
    }

    /**
     * Runs the same artisan command in N separate PHP processes that all start at the same instant.
     *
     * @param  list<list<string>>  $argSets  one argument list per process
     * @return list<array<string, mixed>> decoded JSON line printed by each process
     */
    protected function runConcurrently(string $command, array $argSets): array
    {
        $startAt = microtime(true) + 4.0; // give every process time to boot before the race starts
        $env = [
            'APP_ENV' => 'testing',
            'DB_CONNECTION' => 'pgsql',
            'DB_DATABASE' => config('database.connections.pgsql.database'),
            'CACHE_STORE' => 'array',
            'QUEUE_CONNECTION' => 'sync',
            'MAIL_MAILER' => 'array',
            'BROADCAST_CONNECTION' => 'null',
            'SESSION_DRIVER' => 'array',
        ];

        $pool = Process::pool(function ($pool) use ($command, $argSets, $startAt, $env) {
            foreach ($argSets as $args) {
                $pool->path(base_path())->env($env)->timeout(120)
                    ->command([PHP_BINARY, 'artisan', $command, ...$args, '--at='.$startAt]);
            }
        })->start()->wait();

        $results = [];
        foreach ($pool as $result) {
            $line = trim(collect(explode("\n", trim($result->output())))->last() ?? '');
            $decoded = json_decode($line, true);
            $this->assertIsArray($decoded, "Process failed: {$result->errorOutput()} {$result->output()}");
            $results[] = $decoded;
        }

        return $results;
    }
}
