<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;
use Throwable;

class HealthController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $database = $this->check(fn () => DB::select('select 1'));
        $redis = config('cache.default') === 'redis' || config('queue.default') === 'redis'
            ? $this->check(fn () => Redis::connection()->ping())
            : 'not_configured';

        $healthy = $database === 'ok' && in_array($redis, ['ok', 'not_configured'], true);

        return new JsonResponse([
            'success' => $healthy,
            'message' => $healthy ? 'ok' : 'degraded',
            'data' => [
                'status' => $healthy ? 'ok' : 'degraded',
                'database' => $database,
                'redis' => $redis,
                'time' => now()->toIso8601String(),
            ],
        ], $healthy ? 200 : 503);
    }

    private function check(callable $probe): string
    {
        try {
            $probe();

            return 'ok';
        } catch (Throwable $e) {
            report($e);

            return 'error';
        }
    }
}
