<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;

/**
 * Caches public API payloads as plain JSON-safe arrays.
 *
 * API Resources only convert their top level in resolve(); nested resources/collections stay
 * objects. Serialized into Redis those come back as __PHP_Incomplete_Class and break the response
 * shape. Normalizing through JSON guarantees exactly what the client would have received.
 */
final class PublicCache
{
    public static function remember(string $key, int $seconds, callable $build): array
    {
        return Cache::remember($key, $seconds, fn () => json_decode(json_encode($build(), JSON_THROW_ON_ERROR), true));
    }
}
