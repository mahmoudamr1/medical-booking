<?php

namespace App\Http\Requests\Clinic;

use App\Http\Requests\Concerns\LocationRules;
use App\Models\City;
use App\Models\Clinic;
use App\Models\ClinicBranch;
use App\Support\Phone;
use Illuminate\Foundation\Http\FormRequest;

/** Create (POST) or partial update (PUT …/branches/{branch}) of a branch of the resolved tenant clinic. */
class SaveBranchRequest extends FormRequest
{
    use LocationRules;

    private ?ClinicBranch $existing = null;

    /** The branch being updated (tenant-scoped: another clinic's branch id is 404), or null when creating. */
    public function branch(): ?ClinicBranch
    {
        $id = $this->route('branch');
        /** @var Clinic $clinic set by ResolveClinicTenant */
        $clinic = $this->route('clinic');

        return $id === null ? null : ($this->existing ??= $clinic->branches()->findOrFail($id));
    }

    public function rules(): array
    {
        $existing = $this->branch();
        $req = $existing ? 'sometimes' : 'required';

        return [
            'name_ar' => [$req, 'string', 'max:150'],
            'name_en' => [$req, 'string', 'max:150'],
            'city_id' => [$req, 'ulid', 'exists:cities,id'],
            'area_id' => ['nullable', 'ulid', $this->areaOfCity($existing?->city_id)],
            'address_ar' => [$req, 'string', 'max:255'],
            'address_en' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'regex:'.Phone::CONTACT],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    /** Validated attributes plus the governorate derived from the city. */
    public function branchAttributes(): array
    {
        $data = $this->validated();
        if (isset($data['city_id'])) {
            $data['governorate_id'] = City::findOrFail($data['city_id'])->governorate_id;
        }

        return $data;
    }
}
