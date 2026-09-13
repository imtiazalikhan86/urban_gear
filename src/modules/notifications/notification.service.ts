import { AppError } from '../../shared/errors.js';
import { countUnreadNotifications, createProductNotifications, findNotifications, markNotificationRead } from './notification.repository.js';
import { publishNotification, type NotificationPayload } from './notification.events.js';

type ProductSummary = { id: string; name: string; slug: string };
type NotificationRecord = { id: string; title: string; message: string; readAt: Date | null; createdAt: Date };

function toPayload(notification: NotificationRecord, product: ProductSummary | null): NotificationPayload {
  return {
    id: notification.id,
    title: notification.title,
    message: notification.message,
    readAt: notification.readAt ? notification.readAt.toISOString() : null,
    createdAt: notification.createdAt.toISOString(),
    product: product ? { id: product.id, name: product.name, slug: product.slug } : null,
  };
}

export async function listNotifications(userId: string, query: { unreadOnly: boolean; page: number; pageSize: number }) {
  const where = { userId, ...(query.unreadOnly ? { readAt: null } : {}) };
  const [notifications, total] = await findNotifications(where, (query.page - 1) * query.pageSize, query.pageSize);
  return {
    data: notifications.map((notification) => toPayload(notification, notification.product)),
    meta: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize), unread: await countUnreadNotifications(userId) },
  };
}

export function getUnreadCount(userId: string) {
  return countUnreadNotifications(userId);
}

/** Persists one notification per reseller and pushes it to any stream that reseller has open. */
export async function fanOutProductNotifications(userIds: string[], product: ProductSummary) {
  if (userIds.length === 0) return [];
  const notifications = await createProductNotifications(userIds, product);
  for (const notification of notifications) publishNotification(notification.userId, toPayload(notification, product));
  return notifications;
}

export async function markRead(id: string, userId: string) {
  const result = await markNotificationRead(id, userId);
  if (result.count === 0) throw new AppError(404, 'Notification not found');
}
