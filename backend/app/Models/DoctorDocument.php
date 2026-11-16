<?php

namespace App\Models;

use App\Enums\DocumentType;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DoctorDocument extends Model
{
    use HasUlids;

    /** Allowed upload types (content-sniffed MIME) and the extension each is stored with. */
    public const MIME_EXTENSIONS = ['application/pdf' => 'pdf', 'image/jpeg' => 'jpg', 'image/png' => 'png'];

    protected $fillable = ['doctor_profile_id', 'type', 'disk', 'path', 'original_name', 'mime', 'size'];

    protected $hidden = ['disk', 'path'];

    protected function casts(): array
    {
        return ['type' => DocumentType::class];
    }

    /** @return BelongsTo<DoctorProfile, $this> */
    public function doctorProfile(): BelongsTo
    {
        return $this->belongsTo(DoctorProfile::class);
    }
}
