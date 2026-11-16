<?php

namespace App\Http\Controllers\Api\V1;

use App\Actions\Urgent\UrgentMessages;
use App\Http\Controllers\Controller;
use App\Http\Requests\Urgent\ListMessagesRequest;
use App\Http\Requests\Urgent\StoreMessageRequest;
use App\Http\Resources\UrgentMessageResource;
use App\Models\UrgentRequest;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

/** Message thread between the patient and the accepted doctor of an urgent request. */
class UrgentMessageController extends Controller
{
    public function __construct(private readonly UrgentMessages $messages) {}

    public function index(ListMessagesRequest $request, UrgentRequest $urgentRequest): JsonResponse
    {
        $afterId = $request->validated('after_id');

        return ApiResponse::ok(UrgentMessageResource::collection(
            $this->messages->list($urgentRequest, $request->user(), $afterId === null ? null : (int) $afterId))->resolve($request));
    }

    public function store(StoreMessageRequest $request, UrgentRequest $urgentRequest): JsonResponse
    {
        return ApiResponse::created((new UrgentMessageResource(
            $this->messages->send($urgentRequest, $request->user(), $request->validated('body'))))->resolve($request));
    }
}
