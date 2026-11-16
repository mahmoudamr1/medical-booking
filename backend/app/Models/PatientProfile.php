<?php

namespace App\Models;

use Database\Factories\PatientProfileFactory;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PatientProfile extends Model
{
    /** @use HasFactory<PatientProfileFactory> */
    use HasFactory, HasUlids;

    protected $fillable = ['user_id', 'date_of_birth', 'gender', 'governorate_id', 'city_id'];

    protected function casts(): array
    {
        return ['date_of_birth' => 'date'];
    }

    /** The user's patient profile, created on first use (every account can book and request help). */
    public static function forUser(User $user): self
    {
        return self::firstOrCreate(['user_id' => $user->id]);
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
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
}
