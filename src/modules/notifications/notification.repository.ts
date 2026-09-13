import { prisma } from '../../lib/prisma.js';

type NotificationWhereInput = { userId: string; readAt?: null };

export function createProductNotifications(userIds: string[], product: { id: string; name: string }) {
  return prisma.notification.createManyAndReturn({
    data: userIds.map((userId) => ({ userId, productId: product.id, title: 'New product launched', message: `${product.name} is now available in the Urban Gear catalog.` })),
  });
}

export function findNotifications(where: NotificationWhereInput, skip: number, take: number) {
  return Promise.all([
    prisma.notification.findMany({ where, skip, take, include: { product: true }, orderBy: { createdAt: 'desc' } }),
    prisma.notification.count({ where }),
  ]);
}

export function countUnreadNotifications(userId: string) {
  return prisma.notification.count({ where: { userId, readAt: null } });
}

export function markNotificationRead(id: string, userId: string) {
  return prisma.notification.updateMany({ where: { id, userId, readAt: null }, data: { readAt: new Date() } });
}
