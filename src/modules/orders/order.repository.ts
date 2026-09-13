import { prisma } from '../../lib/prisma.js';

type OrderWhereInput = { resellerId?: string; status?: 'PENDING' | 'CONFIRMED' | 'CANCELLED' };

export function createOrder(data: {
  orderNumber: string;
  resellerId: string;
  currency: string;
  marginPercent: number;
  total: number;
  items: Array<{ productId: string; productName: string; sku: string; quantity: number; costPrice: number; customerUnitPrice: number; lineTotal: number }>;
}) {
  return prisma.order.create({
    data: {
      orderNumber: data.orderNumber,
      resellerId: data.resellerId,
      currency: data.currency,
      marginPercent: data.marginPercent,
      total: data.total,
      items: { create: data.items },
    },
    include: { items: true },
  });
}

export function findOrders(where: OrderWhereInput, skip: number, take: number) {
  return Promise.all([
    prisma.order.findMany({ where, skip, take, include: { items: true }, orderBy: { createdAt: 'desc' } }),
    prisma.order.count({ where }),
  ]);
}

export function findOrderById(id: string) {
  return prisma.order.findUnique({ where: { id }, include: { items: true } });
}

export function updateOrderStatus(id: string, status: 'CONFIRMED' | 'CANCELLED') {
  return prisma.order.update({ where: { id }, data: { status }, include: { items: true } });
}
