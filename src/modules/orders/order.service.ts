import { AppError } from '../../shared/errors.js';
import { findUserById } from '../auth/auth.repository.js';
import { findProductsByIds } from '../quotes/quote.repository.js';
import { createOrder as insertOrder, findOrderById, findOrders, updateOrderStatus } from './order.repository.js';

type OrderItemInput = { productId: string; quantity: number };
type PublicOrder = { id: string; orderNumber: string; status: string; currency: string; marginPercent: number; total: number; createdAt: Date; updatedAt: Date; items: Array<{ productId: string; productName: string; sku: string; quantity: number; customerUnitPrice: number; lineTotal: number }> };

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function publicOrder(order: { id: string; orderNumber: string; status: string; currency: string; marginPercent: unknown; total: unknown; createdAt: Date; updatedAt: Date; items: Array<{ productId: string; productName: string; sku: string; quantity: number; customerUnitPrice: unknown; lineTotal: unknown }> }): PublicOrder {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    currency: order.currency,
    marginPercent: Number(order.marginPercent),
    total: Number(order.total),
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    items: order.items.map((item) => ({ productId: item.productId, productName: item.productName, sku: item.sku, quantity: item.quantity, customerUnitPrice: Number(item.customerUnitPrice), lineTotal: Number(item.lineTotal) })),
  };
}

export async function createOrder(resellerId: string, input: { marginPercent?: number; items: OrderItemInput[] }) {
  const user = await findUserById(resellerId);
  if (!user || user.status !== 'ACTIVE') throw new AppError(401, 'User is not available');
  const products = await findProductsByIds(input.items.map((item) => item.productId));
  const productsById = new Map(products.map((product) => [product.id, product]));
  const missing = input.items.find((item) => !productsById.has(item.productId));
  if (missing) throw new AppError(404, `Product ${missing.productId} not found`);
  const unavailable = input.items.find((item) => !productsById.get(item.productId)!.isAvailable);
  if (unavailable) throw new AppError(409, `Product ${unavailable.productId} is unavailable`);
  const currencies = new Set(products.map((product) => product.currency));
  if (currencies.size !== 1) throw new AppError(400, 'Products in an order must use the same currency');
  const marginPercent = input.marginPercent ?? Number(user.marginPercent);
  const items = input.items.map((item) => {
    const product = productsById.get(item.productId)!;
    const costPrice = Number(product.price);
    const customerUnitPrice = roundCurrency(costPrice * (1 + marginPercent / 100));
    return { productId: product.id, productName: product.name, sku: product.sku, quantity: item.quantity, costPrice, customerUnitPrice, lineTotal: roundCurrency(customerUnitPrice * item.quantity) };
  });
  const total = roundCurrency(items.reduce((sum, item) => sum + item.lineTotal, 0));
  const order = await insertOrder({ orderNumber: `UG-${Date.now()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`, resellerId, currency: products[0]!.currency, marginPercent, total, items });
  return { data: publicOrder(order) };
}

export async function listOrders(actorId: string, actorRole: 'ADMIN' | 'RESELLER', query: { status?: 'PENDING' | 'CONFIRMED' | 'CANCELLED'; page: number; pageSize: number }) {
  const [orders, total] = await findOrders({ ...(actorRole === 'RESELLER' ? { resellerId: actorId } : {}), ...(query.status ? { status: query.status } : {}) }, (query.page - 1) * query.pageSize, query.pageSize);
  return { data: orders.map(publicOrder), meta: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) } };
}

export async function getOrder(id: string, actorId: string, actorRole: 'ADMIN' | 'RESELLER') {
  const order = await findOrderById(id);
  if (!order || (actorRole === 'RESELLER' && order.resellerId !== actorId)) throw new AppError(404, 'Order not found');
  return { data: publicOrder(order) };
}

export async function changeOrderStatus(id: string, status: 'CONFIRMED' | 'CANCELLED') {
  const order = await findOrderById(id);
  if (!order) throw new AppError(404, 'Order not found');
  if (order.status !== 'PENDING') throw new AppError(409, 'Only pending orders can change status');
  return { data: publicOrder(await updateOrderStatus(id, status)) };
}
