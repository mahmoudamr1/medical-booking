<?php

namespace App\Http\Controllers\Api\V1\Doctor;

use App\Enums\DocumentType;
use App\Enums\VerificationStatus;
use App\Exceptions\BusinessRuleException;
use App\Http\Requests\Doctor\StoreDocumentRequest;
use App\Http\Resources\DoctorDocumentResource;
use App\Models\DoctorDocument;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Private verification documents.
 * - Allowed: PDF, JPEG, PNG up to 5 MB; MIME type is detected from file content (not the extension).
 * - Stored on the private "local" disk under a server-generated name; never publicly reachable.
 * - Every access is scoped to the owning doctor (admins use the admin endpoint, which is audited).
 */
class DocumentController extends DoctorController
{
    public function index(Request $request): JsonResponse
    {
        return ApiResponse::ok(DoctorDocumentResource::collection($this->doctor($request)->documents()->latest()->get()));
    }

    public function store(StoreDocumentRequest $request): JsonResponse
    {
        $doctor = $request->doctor();
        if ($doctor->documents()->count() >= 10) {
            throw BusinessRuleException::unprocessable('too_many_documents', __('validation.max.array', ['attribute' => 'documents', 'max' => 10]));
        }

        $file = $request->file('file');
        $mime = $file->getMimeType(); // content-sniffed by Symfony (finfo)
        $name = Str::ulid().'.'.DoctorDocument::MIME_EXTENSIONS[$mime];
        $path = $file->storeAs("verification/{$doctor->id}", $name, 'local');

        $document = $doctor->documents()->create([
            'type' => DocumentType::from($request->string('type')->value()),
            'disk' => 'local',
            'path' => $path,
            'original_name' => mb_substr(basename($file->getClientOriginalName()), 0, 255),
            'mime' => $mime,
            'size' => $file->getSize(),
        ]);

        return ApiResponse::created(new DoctorDocumentResource($document));
    }

    public function download(Request $request, string $document): StreamedResponse
    {
        $doc = $this->doctor($request)->documents()->findOrFail($document);

        return self::stream($doc);
    }

    public function destroy(Request $request, string $document): JsonResponse
    {
        $doctor = $this->doctor($request);
        if ($doctor->verification_status === VerificationStatus::Pending) {
            throw BusinessRuleException::conflict('document_locked', __('doctors.document_locked'));
        }
        $doc = $doctor->documents()->findOrFail($document);
        Storage::disk($doc->disk)->delete($doc->path);
        $doc->delete();

        return ApiResponse::ok(null, __('doctors.document_deleted'));
    }

    public static function stream(DoctorDocument $doc): StreamedResponse
    {
        abort_unless(Storage::disk($doc->disk)->exists($doc->path), 404);

        return Storage::disk($doc->disk)->download($doc->path, $doc->original_name, [
            'Content-Type' => $doc->mime,
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, no-store',
        ]);
    }
}
