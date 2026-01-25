import { Middleware } from 'grammy';
import { BotContext } from '../index.js';
import { logger } from '../../utils/logger.js';

export const loggingMiddleware: Middleware<BotContext> = async (ctx, next) => {
  const start = Date.now();
  const userId = ctx.from?.id;
  const username = ctx.from?.username;
  const messageType = ctx.message ? 'message' : ctx.callbackQuery ? 'callback' : 'other';

  logger.info(`[${messageType}] from user ${userId} (@${username})`);

  await next();

  const duration = Date.now() - start;
  logger.debug(`Request processed in ${duration}ms`);
};
