<?php

namespace Tests\Concerns;

use Illuminate\Testing\TestResponse;

/** Assertions for the API envelope ({ success, message, data, meta? } / { success:false, message, code, errors? }). */
trait AssertsApiResponses
{
    /** A 422 validation envelope whose errors cover exactly $fields (no more, no fewer). */
    protected function assertInvalid(TestResponse $response, string ...$fields): void
    {
        $this->assertErrorEnvelope($response, 422, 'validation_failed');
        $this->assertEqualsCanonicalizing($fields, array_keys($response->json('errors') ?? []), 'Unexpected set of invalid fields');
    }

    /** A failure envelope with a machine code, a human message and no leaked internals. */
    protected function assertErrorEnvelope(TestResponse $response, int $status, string $code): void
    {
        $response->assertStatus($status)->assertJsonPath('success', false)->assertJsonPath('code', $code);
        $this->assertNotSame('', (string) $response->json('message'));
        foreach (['exception', 'file', 'line', 'trace'] as $internal) {
            $response->assertJsonMissingPath($internal);
        }
    }

    /** A successful paginated envelope: list data plus meta.pagination with exactly the four integer keys. */
    protected function assertPaginated(TestResponse $response, int $total, int $perPage, int $page = 1): void
    {
        $response->assertOk()->assertJsonPath('success', true);
        $this->assertIsList($response->json('data'));
        $this->assertSame([
            'current_page' => $page,
            'per_page' => $perPage,
            'total' => $total,
            'last_page' => max(1, (int) ceil($total / $perPage)),
        ], $response->json('meta.pagination'));
    }
}
