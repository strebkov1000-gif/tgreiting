import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { validateTelegramWebAppData } from '../utils/telegramAuth.js';
import { logger } from '../../utils/logger.js';
import { prisma } from '../../database/prisma/client.js';
import { VisitStreakService } from '../../services/streak/VisitStreakService.js';

const visitStreakService = new VisitStreakService(prisma);

export interface AuthRequest extends Request {
  user?: {
    telegramId: bigint;
    userId: string;
    username?: string;
    firstName?: string;
  };
}

/**
 * Auth middleware - validates Telegram WebApp initData
 * Requires x-telegram-init-data header
 * Attaches user data to req.user
 */
export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get initData from header
    const initData = req.headers['x-telegram-init-data'] as string;

    if (!initData) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing Telegram authentication data'
      });
      return;
    }

    // Validate Telegram WebApp initData
    const userData = validateTelegramWebAppData(initData);

    if (!userData) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid Telegram authentication'
      });
      return;
    }

    // Find user in database
    let user = await prisma.user.findUnique({
      where: { telegramId: BigInt(userData.id) },
      select: {
        id: true,
        telegramId: true,
        username: true,
        firstName: true,
        avatarUrl: true
      }
    });

    if (!user) {
      res.status(404).json({
        error: 'Not Found',
        message: 'User not found. Please start the bot first.'
      });
      return;
    }

    // Update avatar URL if changed
    if (userData.photo_url && user.avatarUrl !== userData.photo_url) {
      user = await prisma.user.update({
        where: { telegramId: BigInt(userData.id) },
        data: { avatarUrl: userData.photo_url },
        select: {
          id: true,
          telegramId: true,
          username: true,
          firstName: true,
          avatarUrl: true
        }
      });
    }

    // Attach user to request
    req.user = {
      telegramId: user.telegramId,
      userId: user.id,
      username: user.username || undefined,
      firstName: user.firstName || undefined
    };

    // Process daily visit streak (non-blocking)
    visitStreakService.processVisit(user.id).catch((err) => {
      logger.error('Failed to process visit streak:', { userId: user.id, error: err });
    });

    logger.debug('User authenticated', {
      userId: user.id,
      telegramId: user.telegramId.toString()
    });

    next();
  } catch (error) {
    logger.error('Auth middleware error:', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication failed'
    });
  }
}

/**
 * Optional auth middleware
 * Tries to authenticate but doesn't fail if no auth provided
 * Useful for public endpoints that can show different data for authenticated users
 */
export async function optionalAuthMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const initData = req.headers['x-telegram-init-data'] as string;

    if (!initData) {
      // No auth provided, continue without user
      next();
      return;
    }

    const userData = validateTelegramWebAppData(initData);

    if (!userData) {
      // Invalid auth, continue without user
      next();
      return;
    }

    let user = await prisma.user.findUnique({
      where: { telegramId: BigInt(userData.id) },
      select: {
        id: true,
        telegramId: true,
        username: true,
        firstName: true,
        avatarUrl: true
      }
    });

    if (user) {
      // Update avatar URL if changed
      if (userData.photo_url && user.avatarUrl !== userData.photo_url) {
        user = await prisma.user.update({
          where: { telegramId: BigInt(userData.id) },
          data: { avatarUrl: userData.photo_url },
          select: {
            id: true,
            telegramId: true,
            username: true,
            firstName: true,
            avatarUrl: true
          }
        });
      }

      req.user = {
        telegramId: user.telegramId,
        userId: user.id,
        username: user.username || undefined,
        firstName: user.firstName || undefined
      };

      // Process daily visit streak (non-blocking)
      const userId = user.id;
      visitStreakService.processVisit(userId).catch((err) => {
        logger.error('Failed to process visit streak:', { userId, error: err });
      });
    }

    next();
  } catch (error) {
    logger.error('Optional auth middleware error:', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    // Continue without user on error
    next();
  }
}

/**
 * Check if user is admin
 * (Add admin logic based on your requirements)
 */
export async function adminMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required'
    });
    return;
  }

  // TODO: Implement admin check
  // For now, all authenticated users are allowed
  // You can add admin check by:
  // 1. Adding isAdmin field to User model
  // 2. Checking against whitelist of admin telegram IDs
  // 3. Using separate Admin table

  next();
}
