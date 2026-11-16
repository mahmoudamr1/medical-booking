<?php

namespace App\Http\Requests\Admin;

use App\Services\Settings;
use Illuminate\Foundation\Http\FormRequest;

/** Partial update of platform settings; each key is validated by its definition in Settings::DEFINITIONS. */
class UpdateSettingsRequest extends FormRequest
{
    public function rules(): array
    {
        return collect(Settings::DEFINITIONS)->map(fn ($def) => ['sometimes', ...explode('|', $def[1])])->all();
    }
}
