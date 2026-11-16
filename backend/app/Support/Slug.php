<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class Slug
{
    /** Unique slug for $table.$column, from an English (preferred) or Arabic name. */
    public static function unique(string $table, string $source, string $column = 'slug'): string
    {
        $base = Str::slug($source) ?: Str::lower(Str::random(8));
        $slug = $base;
        $i = 2;
        while (DB::table($table)->where($column, $slug)->exists()) {
            $slug = $base.'-'.$i++;
        }

        return $slug;
    }
}
