<?php

namespace App\Support;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Http\Resources\Json\ResourceCollection;
use Illuminate\Pagination\LengthAwarePaginator;

/** Builds the API envelope: { success, message, data, meta? } / { success:false, message, errors?, code? }. */
final class ApiResponse
{
    public static function ok(mixed $data = null, ?string $message = null, int $status = 200): JsonResponse
    {
        $payload = ['success' => true, 'message' => $message ?? __('api.ok'), 'data' => null];

        if ($data instanceof ResourceCollection && $data->resource instanceof LengthAwarePaginator) {
            $paginator = $data->resource;
            $payload['data'] = $data->collection->map->resolve(request())->all();
            $payload['meta'] = ['pagination' => self::pagination($paginator)];
        } elseif ($data instanceof JsonResource) {
            $payload['data'] = $data->resolve(request());
        } else {
            $payload['data'] = $data;
        }

        return new JsonResponse($payload, $status);
    }

    /**
     * For paginators whose items were already transformed to arrays. $meta adds keys next to `pagination`.
     *
     * @param  LengthAwarePaginator<array-key, mixed>  $paginator
     * @param  array<string, mixed>  $meta
     */
    public static function paginated(LengthAwarePaginator $paginator, ?string $message = null, array $meta = []): JsonResponse
    {
        return new JsonResponse([
            'success' => true,
            'message' => $message ?? __('api.ok'),
            'data' => array_values($paginator->items()),
            'meta' => ['pagination' => self::pagination($paginator)] + $meta,
        ]);
    }

    public static function created(mixed $data = null, ?string $message = null): JsonResponse
    {
        return self::ok($data, $message ?? __('api.created'), 201);
    }

    public static function noContent(): JsonResponse
    {
        return new JsonResponse(null, 204);
    }

    /** @param array<string, list<string>>|null $errors */
    public static function error(string $message, int $status, ?array $errors = null, ?string $code = null, array $extra = []): JsonResponse
    {
        $payload = ['success' => false, 'message' => $message];
        if ($errors !== null) {
            $payload['errors'] = $errors;
        }
        if ($code !== null) {
            $payload['code'] = $code;
        }

        return new JsonResponse($payload + $extra, $status);
    }

    /**
     * @param  LengthAwarePaginator<array-key, mixed>  $p
     * @return array<string, int>
     */
    private static function pagination(LengthAwarePaginator $p): array
    {
        return [
            'current_page' => $p->currentPage(),
            'per_page' => $p->perPage(),
            'total' => $p->total(),
            'last_page' => $p->lastPage(),
        ];
    }
}
