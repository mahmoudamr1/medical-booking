<?php

namespace App\Support\Database;

use Illuminate\Support\Facades\DB;

/** Small helpers for PostgreSQL constraints that the schema builder doesn't express. */
final class Constraints
{
    /** @param list<string> $values */
    public static function in(string $table, string $column, array $values, bool $nullable = false): void
    {
        $list = implode(',', array_map(fn (string $v) => "'".str_replace("'", "''", $v)."'", $values));
        $expr = $nullable ? "{$column} IS NULL OR {$column} IN ({$list})" : "{$column} IN ({$list})";
        self::check($table, "{$table}_{$column}_in", $expr);
    }

    public static function check(string $table, string $name, string $expression): void
    {
        DB::statement("ALTER TABLE {$table} ADD CONSTRAINT {$name} CHECK ({$expression})");
    }
}
