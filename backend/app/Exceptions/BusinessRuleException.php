<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * A violated business rule. Rendered as { success:false, message, code, errors? } with the given status.
 * Typical: 409 conflicts (booking_conflict, invalid_transition), 422 policy violations.
 */
class BusinessRuleException extends RuntimeException
{
    /** @param array<string, list<string>>|null $errors */
    public function __construct(
        string $message,
        public readonly string $errorCode = 'business_rule_violation',
        public readonly int $status = 409,
        public readonly ?array $errors = null,
        public readonly array $extra = [],
    ) {
        parent::__construct($message);
    }

    public static function conflict(string $code, string $message, ?array $errors = null): self
    {
        return new self($message, $code, 409, $errors);
    }

    public static function unprocessable(string $code, string $message, ?array $errors = null, array $extra = []): self
    {
        return new self($message, $code, 422, $errors, $extra);
    }
}
