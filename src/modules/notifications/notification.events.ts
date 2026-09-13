import { EventEmitter } from 'node:events';

export interface NotificationPayload {
  id: string;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
  product: { id: string; name: string; slug: string } | null;
}

/**
 * In-process delivery bus for open notification streams. A single Node process serves
 * every stream today; replace the emitter with Postgres LISTEN/NOTIFY or Redis pub/sub
 * before running more than one backend instance.
 */
const emitter = new EventEmitter();
emitter.setMaxListeners(0);

const channelFor = (userId: string) => `notification:${userId}`;

export function publishNotification(userId: string, payload: NotificationPayload): void {
  emitter.emit(channelFor(userId), payload);
}

export function subscribeToNotifications(userId: string, listener: (payload: NotificationPayload) => void): () => void {
  const channel = channelFor(userId);
  emitter.on(channel, listener);
  return () => {
    emitter.off(channel, listener);
  };
}
