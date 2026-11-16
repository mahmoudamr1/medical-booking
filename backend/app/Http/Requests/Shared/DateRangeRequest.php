<?php

namespace App\Http\Requests\Shared;

use App\Http\Requests\Concerns\ListFilters;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Http\FormRequest;

/** Report window: optional from/to, defaulting to the 30 days either side of now. */
class DateRangeRequest extends FormRequest
{
    use ListFilters;

    public function rules(): array
    {
        return $this->dateRangeRules();
    }

    /** @return array{0:CarbonImmutable,1:CarbonImmutable} */
    public function range(): array
    {
        return [
            CarbonImmutable::parse($this->validated('from') ?? now()->subDays(30))->utc(),
            CarbonImmutable::parse($this->validated('to') ?? now()->addDays(30))->utc(),
        ];
    }
}
