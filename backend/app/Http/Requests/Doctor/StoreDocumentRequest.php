<?php

namespace App\Http\Requests\Doctor;

use App\Enums\DocumentType;
use App\Models\DoctorDocument;
use Illuminate\Validation\Rule;

class StoreDocumentRequest extends DoctorRequest
{
    public function rules(): array
    {
        return [
            'type' => ['required', Rule::enum(DocumentType::class)],
            'file' => ['required', 'file', 'mimetypes:'.implode(',', array_keys(DoctorDocument::MIME_EXTENSIONS)), 'max:5120'],
        ];
    }
}
