<?php

namespace App\Models;

use App\Enums\AffiliationStatus;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DoctorBranchAffiliation extends Model
{
    use HasUlids;

    protected $fillable = ['doctor_profile_id', 'clinic_branch_id', 'clinic_id', 'status'];

    protected function casts(): array
    {
        return ['status' => AffiliationStatus::class];
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
