<?php

namespace App\Http\Requests\Concerns;

/** Rule fragments shared by list/filter requests (pagination, date ranges). */
trait ListFilters
{
    /** @return list<string> */
    protected function perPageRule(int $max): array
    {
        return ['nullable', 'integer', 'min:1', 'max:'.$max];
    }

    /** Optional `from`/`to` datetimes; when $ordered, `to` must be after `from`. */
    protected function dateRangeRules(bool $ordered = true): array
    {
        return [
            'from' => ['nullable', 'date'],
            'to' => $ordered ? ['nullable', 'date', 'after:from'] : ['nullable', 'date'],
        ];
    }
}
