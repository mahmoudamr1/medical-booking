<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BranchHour extends Model
{
    public $timestamps = false;

    protected $fillable = ['clinic_branch_id', 'day_of_week', 'opens_at', 'closes_at'];

    /** @return BelongsTo<ClinicBranch, $this> */
    public function branch(): BelongsTo
    {
        return $this->belongsTo(ClinicBranch::class, 'clinic_branch_id');
    }
}
