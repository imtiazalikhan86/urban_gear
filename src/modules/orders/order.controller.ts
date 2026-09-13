import type { Request, Response } from 'express';
import { asyncHandler } from '../../shared/async-handler.js';
import { createOrderSchema, orderIdParamsSchema, orderListQuerySchema, updateOrderStatusSchema } from './order.schemas.js';
import { changeOrderStatus, createOrder, getOrder, listOrders } from './order.service.js';

export const createOrderController = asyncHandler(async (request: Request, response: Response) => response.status(201).json(await createOrder(request.user!.id, createOrderSchema.parse(request.body))));
export const listOrdersController = asyncHandler(async (request: Request, response: Response) => response.json(await listOrders(request.user!.id, request.user!.role, orderListQuerySchema.parse(request.query))));
export const getOrderController = asyncHandler(async (request: Request, response: Response) => response.json(await getOrder(orderIdParamsSchema.parse(request.params).id, request.user!.id, request.user!.role)));
export const updateOrderStatusController = asyncHandler(async (request: Request, response: Response) => response.json(await changeOrderStatus(orderIdParamsSchema.parse(request.params).id, updateOrderStatusSchema.parse(request.body).status)));
