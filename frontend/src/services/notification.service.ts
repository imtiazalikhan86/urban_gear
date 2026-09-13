import { api, http } from './http';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
  product: { id: string; name: string; slug: string } | null;
}

export interface NotificationListResponse {
  data: NotificationItem[];
  meta: { page: number; pageSize: number; total: number; totalPages: number; unread: number };
}

interface StreamHandlers {
  onNotification: (notification: NotificationItem) => void;
  onReady?: (unread: number) => void;
}

const MAX_RETRY_DELAY_MS = 15000;

function dispatchFrame(frame: string, handlers: StreamHandlers) {
  let eventName = 'message';
  const dataLines: string[] = [];
  for (const line of frame.split('\n')) {
    if (line.startsWith(':')) continue;
    if (line.startsWith('event:')) eventName = line.slice(6).trim();
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
  }
  if (!dataLines.length) return;

  try {
    const data = JSON.parse(dataLines.join('\n'));
    if (eventName === 'notification') handlers.onNotification(data as NotificationItem);
    if (eventName === 'ready') handlers.onReady?.((data as { unread: number }).unread);
  } catch {
    // Ignore malformed frames and keep the stream open.
  }
}

async function readFrames(body: ReadableStream<Uint8Array>, handlers: StreamHandlers) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  for (;;) {
    const { value, done } = await reader.read();
    if (done) return;
    buffer += decoder.decode(value, { stream: true });
    for (let boundary = buffer.indexOf('\n\n'); boundary >= 0; boundary = buffer.indexOf('\n\n')) {
      dispatchFrame(buffer.slice(0, boundary), handlers);
      buffer = buffer.slice(boundary + 2);
    }
  }
}

/**
 * Opens the Server-Sent Events stream so a reseller sees a new product alert without
 * reloading. Uses fetch rather than EventSource to keep the bearer token in a header,
 * and reconnects with exponential backoff. Returns an unsubscribe function.
 */
export function streamNotifications(handlers: StreamHandlers): () => void {
  const controller = new AbortController();
  let stopped = false;
  let retryDelay = 1000;

  async function connect() {
    while (!stopped) {
      try {
        const token = localStorage.getItem('urbangear.accessToken');
        if (!token) return;
        const response = await fetch(`${http.defaults.baseURL ?? ''}/notifications/stream`, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
          signal: controller.signal,
        });
        if (response.status === 401) return;
        if (!response.ok || !response.body) throw new Error(`Notification stream failed with ${response.status}`);
        retryDelay = 1000;
        await readFrames(response.body, handlers);
      } catch {
        // Fall through to the backoff below; an aborted stream exits on the next check.
      }
      if (stopped) return;
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
      retryDelay = Math.min(retryDelay * 2, MAX_RETRY_DELAY_MS);
    }
  }

  void connect();
  return () => {
    stopped = true;
    controller.abort();
  };
}

export const notificationService = {
  list: (unreadOnly = false) => api.get<NotificationListResponse>('/notifications', { unreadOnly, pageSize: 20 }),
  markRead: (id: string) => api.patch<void>(`/notifications/${id}/read`),
  stream: streamNotifications,
};
