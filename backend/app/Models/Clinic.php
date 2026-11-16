<?php

namespace App\Models;

use App\Enums\ClinicStatus;
use Database\Factories\ClinicFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Clinic extends Model
{
    /** @use HasFactory<ClinicFactory> */
    use HasFactory, HasUlids;

    protected $attributes = ['status' => 'active', 'type' => 'clinic', 'is_personal_practice' => false];

    protected $fillable = [
        'owner_user_id', 'slug', 'name_ar', 'name_en', 'description_ar', 'description_en',
        'phone', 'email', 'logo_path', 'is_personal_practice', 'type',
    ];

    protected function casts(): array
    {
        return ['status' => ClinicStatus::class, 'is_personal_practice' => 'boolean'];
    }

    /** @return BelongsTo<User, $this> */
    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_user_id');
    }

    /** @return HasMany<ClinicMembership, $this> */
    public function memberships(): HasMany
    {
        return $this->hasMany(ClinicMembership::class);
    }

    /** @return HasMany<ClinicBranch, $this> */
    public function branches(): HasMany
    {
        return $this->hasMany(ClinicBranch::class);
    }

    /** @return HasMany<DoctorBranchAffiliation, $this> */
    public function affiliations(): HasMany
    {
        return $this->hasMany(DoctorBranchAffiliation::class);
    }

    /** @return HasMany<MedicalService, $this> */
    public function services(): HasMany
    {
        return $this->hasMany(MedicalService::class);
    }

    /**
     * @param  Builder<Clinic>  $query
     * @return Builder<Clinic>
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', ClinicStatus::Active->value);
    }
}
