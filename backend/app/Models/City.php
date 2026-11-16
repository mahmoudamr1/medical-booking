<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class City extends Model
{
    use HasUlids;

    protected $fillable = ['governorate_id', 'slug', 'name_ar', 'name_en'];

    /** @return BelongsTo<Governorate, $this> */
    public function governorate(): BelongsTo
    {
        return $this->belongsTo(Governorate::class);
    }

    /** @return HasMany<Area, $this> */
    public function areas(): HasMany
    {
        return $this->hasMany(Area::class);
    }
}
