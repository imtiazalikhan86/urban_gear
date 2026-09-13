import { prisma } from '../../lib/prisma.js';

export function findProductsByIds(ids: string[]) {
  return prisma.product.findMany({ where: { id: { in: ids } } });
}
