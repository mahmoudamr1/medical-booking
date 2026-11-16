<?php

namespace App\Models;

use Database\Factories\ClinicBranchFactory;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ClinicBranch extends Model
{
    /** @use HasFactory<ClinicBranchFactory> */
    use HasFactory, HasUlids;

    protected $fillable = [
        'clinic_id', 'name_ar', 'name_en', 'governorate_id', 'city_id', 'area_id',
        'address_ar', 'address_en', 'phone', 'latitude', 'longitude', 'is_active',
    ];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    /** @return BelongsTo<Clinic, $this> */
    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class);
    }

    /** @return BelongsTo<Governorate, $this> */
    public function governorate(): BelongsTo
    {
        return $this->belongsTo(Governorate::class);
    }

    /** @return BelongsTo<City, $this> */
    public function city(): BelongsTo
    {
        return $this->belongsTo(City::class);
    }

    /** @return BelongsTo<Area, $this> */
    public function area(): BelongsTo
    {
        return $this->belongsTo(Area::class);
    }

    /** @return HasMany<BranchHour, $this> */
    public function hours(): HasMany
    {
        return $this->hasMany(BranchHour::class)->orderBy('day_of_week')->orderBy('opens_at');
    }

    /** @return HasMany<DoctorBranchAffiliation, $this> */
    public function affiliations(): HasMany
    {
        return $this->hasMany(DoctorBranchAffiliation::class);
    }
}
