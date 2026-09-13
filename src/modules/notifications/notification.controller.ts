import type { Request, Response } from 'express';
import { asyncHandler } from '../../shared/async-handler.js';
import { subscribeToNotifications } from './notification.events.js';
import { notificationIdParamsSchema, notificationListQuerySchema } from './notification.schemas.js';
import { getUnreadCount, listNotifications, markRead } from './notification.service.js';

const HEARTBEAT_INTERVAL_MS = 25_000;

export const listNotificationsController = asyncHandler(async (request: Request, response: Response) => response.json(await listNotifications(request.user!.id, notificationListQuerySchema.parse(request.query))));

export const streamNotificationsController = asyncHandler(async (request: Request, response: Response) => {
  const userId = request.user!.id;
  const send = (event: string, data: unknown) => {
    if (!response.writableEnded) response.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  request.socket.setTimeout(0);
  response.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  response.write('retry: 3000\n\n');
  send('ready', { unread: await getUnreadCount(userId) });

  const unsubscribe = subscribeToNotifications(userId, (payload) => send('notification', payload));
  const heartbeat = setInterval(() => {
    if (!response.writableEnded) response.write(': heartbeat\n\n');
  }, HEARTBEAT_INTERVAL_MS);
  heartbeat.unref();

  request.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
    response.end();
  });
});

export const markNotificationReadController = asyncHandler(async (request: Request, response: Response) => {
  await markRead(notificationIdParamsSchema.parse(request.params).id, request.user!.id);
  response.status(204).send();
});
