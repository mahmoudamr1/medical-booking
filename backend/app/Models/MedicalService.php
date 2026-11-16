<?php

namespace App\Models;

use App\Enums\ConsultationType;
use Database\Factories\MedicalServiceFactory;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MedicalService extends Model
{
    /** @use HasFactory<MedicalServiceFactory> */
    use HasFactory, HasUlids;

    protected $fillable = [
        'doctor_profile_id', 'clinic_branch_id', 'clinic_id', 'name_ar', 'name_en',
        'consultation_type', 'duration_minutes', 'price', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'consultation_type' => ConsultationType::class,
            'price' => 'decimal:2',
            'is_active' => 'boolean',
            'duration_minutes' => 'integer',
        ];
    }

    /** @return BelongsTo<DoctorProfile, $this> */
    public function doctorProfile(): BelongsTo
    {
        return $this->belongsTo(DoctorProfile::class);
    }

    /** @return BelongsTo<ClinicBranch, $this> */
    public function branch(): BelongsTo
    {
        return $this->belongsTo(ClinicBranch::class, 'clinic_branch_id');
    }

    /** @return BelongsTo<Clinic, $this> */
    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class);
    }
}
