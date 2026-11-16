<?php

namespace App\Http\Requests\Admin;

use App\Models\Specialty;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** Create (POST) or partial update (PUT /admin/specialties/{specialty}). */
class SaveSpecialtyRequest extends FormRequest
{
    public function rules(): array
    {
        /** @var Specialty|null $specialty */
        $specialty = $this->route('specialty');
        $sometimes = $specialty ? 'sometimes' : 'required';

        return [
            'slug' => [$sometimes, 'string', 'max:80', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', Rule::unique('specialties', 'slug')->ignore($specialty?->id)],
            'name_ar' => [$sometimes, 'string', 'max:100'],
            'name_en' => [$sometimes, 'string', 'max:100'],
            'description_ar' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'description_en' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'icon' => ['sometimes', 'nullable', 'string', 'max:50', 'regex:/^[a-z0-9-]+$/'],
            'is_active' => ['sometimes', 'boolean'],
            'is_general_practice' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:1000'],
        ];
    }
}
