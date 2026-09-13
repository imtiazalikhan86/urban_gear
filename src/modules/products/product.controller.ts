import type { Request, Response } from 'express';
import { createProductSchema, productIdParamsSchema, productListQuerySchema, updateProductSchema } from './product.schemas.js';
import { createProduct, deleteProduct, getProduct, listProducts, updateProduct } from './product.service.js';

export async function listProductsController(request: Request, response: Response): Promise<void> {
  const query = productListQuerySchema.parse(request.query);
  response.json(await listProducts(query));
}

export async function getProductController(request: Request, response: Response): Promise<void> {
  const { id } = productIdParamsSchema.parse(request.params);
  response.json({ data: await getProduct(id) });
}

export async function createProductController(request: Request, response: Response): Promise<void> {
  const input = createProductSchema.parse(request.body);
  response.status(201).json({ data: await createProduct(input) });
}

export async function updateProductController(request: Request, response: Response): Promise<void> {
  const { id } = productIdParamsSchema.parse(request.params);
  const input = updateProductSchema.parse(request.body);
  response.json({ data: await updateProduct(id, input) });
}

export async function deleteProductController(request: Request, response: Response): Promise<void> {
  const { id } = productIdParamsSchema.parse(request.params);
  await deleteProduct(id);
  response.status(204).send();
}
