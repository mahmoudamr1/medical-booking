export interface AppNotification {
  id: string;
  kind: string | null;
  title: string | null;
  body: string | null;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string | null;
}

export interface UnreadCount {
  unread: number;
}
