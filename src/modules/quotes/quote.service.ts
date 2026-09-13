import { AppError } from '../../shared/errors.js';
import { findUserById } from '../auth/auth.repository.js';
import { findProductsByIds } from './quote.repository.js';

type QuoteItemInput = { productId: string; quantity: number };

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export async function previewQuote(userId: string, input: { marginPercent?: number; items: QuoteItemInput[] }) {
  const user = await findUserById(userId);
  if (!user || user.status !== 'ACTIVE') throw new AppError(401, 'User is not available');

  const products = await findProductsByIds(input.items.map((item) => item.productId));
  const productsById = new Map(products.map((product) => [product.id, product]));
  const missingProduct = input.items.find((item) => !productsById.has(item.productId));
  if (missingProduct) throw new AppError(404, `Product ${missingProduct.productId} not found`);

  const marginPercent = input.marginPercent ?? Number(user.marginPercent);
  const currencies = new Set(products.map((product) => product.currency));
  if (currencies.size !== 1) throw new AppError(400, 'Products in a quote must use the same currency');

  const items = input.items.map((item) => {
    const product = productsById.get(item.productId)!;
    const costPrice = Number(product.price);
    const customerUnitPrice = roundCurrency(costPrice * (1 + marginPercent / 100));
    return {
      productId: product.id,
      productName: product.name,
      quantity: item.quantity,
      customerUnitPrice,
      customerLineTotal: roundCurrency(customerUnitPrice * item.quantity),
    };
  });
  const total = roundCurrency(items.reduce((sum, item) => sum + item.customerLineTotal, 0));

  return { data: { items, currency: products[0]!.currency, marginPercent, total } };
}
