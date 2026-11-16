<?php

namespace App\Http\Requests\Concerns;

use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Exists;

/** Location hierarchy checks: a city must belong to the submitted governorate, an area to its city. */
trait LocationRules
{
    protected function cityOfGovernorate(): Exists
    {
        return Rule::exists('cities', 'id')->where('governorate_id', $this->input('governorate_id'));
    }

    /** $fallbackCityId is used when the payload has no city_id (e.g. a partial update). */
    protected function areaOfCity(?string $fallbackCityId = null): Exists
    {
        return Rule::exists('areas', 'id')->where('city_id', $this->input('city_id', $fallbackCityId));
    }
}
