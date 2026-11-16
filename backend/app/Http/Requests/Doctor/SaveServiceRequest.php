<?php

namespace App\Http\Requests\Doctor;

use App\Enums\ConsultationType;
use App\Exceptions\BusinessRuleException;
use App\Models\MedicalService;
use Illuminate\Validation\Rule;

/** Create (POST /doctor/services) or partial update (PUT /doctor/services/{service}) of the caller's own service. */
class SaveServiceRequest extends DoctorRequest
{
    private ?MedicalService $existing = null;

    /** The service being updated (own services only: another doctor's id is 404), or null when creating. */
    public function service(): ?MedicalService
    {
        $id = $this->route('service');

        return $id === null ? null : ($this->existing ??= $this->doctor()->services()->findOrFail($id));
    }

    public function rules(): array
    {
        $req = $this->service() ? 'sometimes' : 'required';

        return [
            'name_ar' => [$req, 'string', 'max:150'],
            'name_en' => [$req, 'string', 'max:150'],
            'consultation_type' => [$req, Rule::enum(ConsultationType::class)],
            'clinic_branch_id' => ['nullable', 'ulid', Rule::in($this->doctor()->activeBranchIds())],
            'duration_minutes' => [$req, 'integer', 'min:5', 'max:240'],
            'price' => [$req, 'numeric', 'min:0', 'max:100000'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    /** Validated attributes with the branch rule applied: in-person services need a branch, online ones never have one. */
    public function serviceAttributes(): array
    {
        $data = $this->validated();
        $existing = $this->service();

        $type = $data['consultation_type'] ?? $existing?->consultation_type->value;
        $branchId = array_key_exists('clinic_branch_id', $data) ? $data['clinic_branch_id'] : $existing?->clinic_branch_id;
        if ($type !== ConsultationType::Online->value && ! $branchId) {
            throw BusinessRuleException::unprocessable('validation_failed', __('api.validation_failed'),
                ['clinic_branch_id' => [__('schedule.branch_required')]]);
        }
        if ($type === ConsultationType::Online->value) {
            $branchId = null;
        }
        $data['clinic_branch_id'] = $branchId;
        $data['clinic_id'] = $branchId ? $this->doctor()->affiliations()->where('clinic_branch_id', $branchId)->value('clinic_id') : null;

        return $data;
    }
}
