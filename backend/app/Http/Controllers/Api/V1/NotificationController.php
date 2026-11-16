<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Notification\ListNotificationsRequest;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification;

/** The signed-in user's own database notifications (persistent; used for the bell + polling). */
class NotificationController extends Controller
{
    public function index(ListNotificationsRequest $request): JsonResponse
    {
        $query = $request->user()->notifications()->latest();
        if ($request->boolean('unread')) {
            $query->whereNull('read_at');
        }
        $page = $query->paginate($request->validated('per_page') ?? 20);
        $page->getCollection()->transform(fn (DatabaseNotification $n) => $this->row($n));

        return ApiResponse::paginated($page);
    }

    public function unreadCount(Request $request): JsonResponse
    {
        return ApiResponse::ok(['unread' => $request->user()->unreadNotifications()->count()]);
    }

    public function markRead(Request $request, string $id): JsonResponse
    {
        $notification = $request->user()->notifications()->findOrFail($id);
        $notification->markAsRead();

        return ApiResponse::ok($this->row($notification));
    }

    public function markAllRead(Request $request): JsonResponse
    {
        $request->user()->unreadNotifications()->update(['read_at' => now()]);

        return ApiResponse::ok(['unread' => 0]);
    }

    private function row(DatabaseNotification $n): array
    {
        return [
            'id' => $n->id,
            'kind' => $n->data['kind'] ?? null,
            // Rendered in the requester's language (Accept-Language), falling back to the stored text.
            'title' => $n->data['i18n'][app()->getLocale()]['title'] ?? $n->data['title'] ?? null,
            'body' => $n->data['i18n'][app()->getLocale()]['body'] ?? $n->data['body'] ?? null,
            'data' => $n->data['data'] ?? [],
            'read_at' => $n->read_at?->toIso8601String(),
            'created_at' => $n->created_at?->toIso8601String(),
        ];
    }
}
