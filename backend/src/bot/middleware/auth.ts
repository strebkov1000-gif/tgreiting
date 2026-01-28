import { Middleware } from 'grammy';
import { BotContext } from '../index.js';
import { prisma } from '../../database/prisma/client.js';
import { logger } from '../../utils/logger.js';

export const authMiddleware: Middleware<BotContext> = async (ctx, next) => {
  if (!ctx.from) {
    return next();
  }

  const telegramId = BigInt(ctx.from.id);
  const username = ctx.from.username;
  const firstName = ctx.from.first_name;
  const lastName = ctx.from.last_name;
  const isPremium = ctx.from.is_premium || false;

  try {
    // Find or create user
    let user = await prisma.user.findUnique({
      where: { telegramId },
    });

    let isNewUser = false;

    if (!user) {
      logger.info(`Creating new user: ${telegramId} (@${username})`);
      user = await prisma.user.create({
        data: {
          telegramId,
          username,
          firstName,
          lastName,
          isPremium,
        },
      });
      isNewUser = true;
    } else {
      // Update user info if changed
      const needsUpdate =
        user.username !== username ||
        user.firstName !== firstName ||
        user.lastName !== lastName ||
        user.isPremium !== isPremium;

      if (needsUpdate) {
        user = await prisma.user.update({
          where: { telegramId },
          data: {
            username,
            firstName,
            lastName,
            isPremium,
            lastActivity: new Date(),
          },
        });
      } else {
        // Just update last activity
        await prisma.user.update({
          where: { telegramId },
          data: { lastActivity: new Date() },
        });
      }
    }

    // Store user info in session
    ctx.session = {
      userId: user.id,
      username: username || '',
      isNewUser,
    };

    await next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    await next();
  }
};
