import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env.js';
import { openApiDocument } from './docs/openapi.js';
import { logger } from './lib/logger.js';
import { authRouter } from './modules/auth/index.js';
import { productRouter } from './modules/products/product.routes.js';
import { quoteRouter } from './modules/quotes/quote.routes.js';
import { orderRouter } from './modules/orders/order.routes.js';
import { notificationRouter } from './modules/notifications/notification.routes.js';
import { userRouter } from './modules/users/user.routes.js';
import { errorHandler, notFoundHandler } from './shared/http.js';

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json({ limit: '1mb' }));
app.use(pinoHttp({ logger }));

/**
 * @openapi
 * /health:
 *   get:
 *     tags: [System]
 *     summary: Check service health
 *     responses:
 *       200: { description: Service is healthy }
 */
app.get('/health', (_request, response) => {
  response.json({ status: 'ok', service: 'urbangear-backend' });
});

app.get('/api/openapi.json', (_request, response) => {
  response.json(openApiDocument);
});
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument, { explorer: true }));

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/quotes', quoteRouter);
app.use('/api/v1/orders', orderRouter);
app.use('/api/v1/notifications', notificationRouter);
app.use('/api/v1/products', productRouter);
app.use(notFoundHandler);
app.use(errorHandler);
