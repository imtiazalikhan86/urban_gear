import path from 'node:path';
import { fileURLToPath } from 'node:url';
import swaggerJSDoc from 'swagger-jsdoc';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

const definition = {
  openapi: '3.0.3',
  info: {
    title: 'Urban Gear Reseller API',
    version: '0.1.0',
    description: 'Backend API for the Urban Gear reseller platform.',
  },
  servers: [{ url: 'http://localhost:3000', description: 'Local development' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Error: {
        type: 'object',
        required: ['error'],
        properties: {
          error: {
            type: 'object',
            required: ['code', 'message'],
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              details: { type: 'array', items: { type: 'object' } },
            },
          },
        },
      },
      User: {
        type: 'object',
        required: ['id', 'email', 'name', 'role', 'status', 'marginPercent'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          name: { type: 'string' },
          role: { type: 'string', enum: ['ADMIN', 'RESELLER'] },
          status: { type: 'string', enum: ['ACTIVE', 'SUSPENDED'] },
          marginPercent: { type: 'number', minimum: 0, maximum: 1000 },
        },
      },
      Product: {
        type: 'object',
        required: ['id', 'sku', 'name', 'slug', 'description', 'category', 'price', 'currency', 'isAvailable'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          sku: { type: 'string' },
          name: { type: 'string' },
          slug: { type: 'string' },
          description: { type: 'string' },
          category: { type: 'string' },
          price: { type: 'string', example: '1499.00' },
          currency: { type: 'string', example: 'INR' },
          imageUrl: { type: 'string', format: 'uri', nullable: true },
          isAvailable: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
} as const;

export const openApiDocument = swaggerJSDoc({
  definition,
  apis: [
    path.resolve(currentDirectory, '../modules/**/*.routes.ts'),
    path.resolve(currentDirectory, '../../dist/modules/**/*.routes.js'),
    path.resolve(currentDirectory, '../app.ts'),
    path.resolve(currentDirectory, '../../dist/app.js'),
  ],
});
