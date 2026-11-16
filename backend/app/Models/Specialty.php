<?php

namespace App\Models;

use Database\Factories\SpecialtyFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Specialty extends Model
{
    /** @use HasFactory<SpecialtyFactory> */
    use HasFactory, HasUlids;

    protected $fillable = [
        'slug', 'name_ar', 'name_en', 'description_ar', 'description_en', 'icon',
        'is_active', 'is_general_practice', 'sort_order',
    ];

    protected function casts(): array
    {
        return ['is_active' => 'boolean', 'is_general_practice' => 'boolean'];
    }

    /** @return BelongsToMany<DoctorProfile, $this> */
    public function doctors(): BelongsToMany
    {
        return $this->belongsToMany(DoctorProfile::class, 'doctor_specialties')->withPivot('is_primary');
    }

    /**
     * @param  Builder<Specialty>  $query
     * @return Builder<Specialty>
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true)->orderBy('sort_order')->orderBy('name_en');
    }
}
