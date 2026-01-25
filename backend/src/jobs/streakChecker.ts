import cron from 'node-cron';
import { differenceInHours } from 'date-fns';
import { logger } from '../utils/logger.js';
import { prisma } from '../database/prisma/client.js';

/**
 * Streak checker background job
 * Checks for broken streaks daily at 00:00 UTC
 * Resets streak to 0 if user hasn't checked in for > 48 hours
 */
export function startStreakCheckerJob() {
  // Run daily at 00:00 UTC
  const cronExpression = '0 0 * * *';

  cron.schedule(cronExpression, async () => {
    try {
      logger.info('Starting streak checker job');

      // Get all users with active streaks
      const users = await prisma.user.findMany({
        where: {
          currentStreak: { gt: 0 },
          lastCheckIn: { not: null }
        },
        select: {
          id: true,
          telegramId: true,
          currentStreak: true,
          lastCheckIn: true
        }
      });

      logger.info(`Streak checker: Found ${users.length} users with active streaks`);

      let resetCount = 0;

      const now = new Date();

      for (const user of users) {
        if (!user.lastCheckIn) continue;

        const hoursSinceLastCheckIn = differenceInHours(now, user.lastCheckIn);

        // Reset streak if > 48 hours passed
        if (hoursSinceLastCheckIn > 48) {
          try {
            await prisma.user.update({
              where: { id: user.id },
              data: { currentStreak: 0 }
            });

            resetCount++;

            logger.info('Streak reset', {
              userId: user.id,
              telegramId: user.telegramId.toString(),
              previousStreak: user.currentStreak,
              hoursSinceCheckIn: hoursSinceLastCheckIn
            });

            // TODO: Send notification to user about broken streak
            // You can integrate TelegramNotifier here
          } catch (error) {
            logger.error('Failed to reset streak:', {
              userId: user.id,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
      }

      logger.info('Streak checker job completed', {
        total: users.length,
        reset: resetCount
      });
    } catch (error) {
      logger.error('Streak checker job failed:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  logger.info('Streak checker job scheduled (daily at 00:00 UTC)');
}

/**
 * Check and reset expired streaks (manual trigger)
 */
export async function checkExpiredStreaks(): Promise<{
  checked: number;
  reset: number;
}> {
  try {
    logger.info('Manual streak check triggered');

    const users = await prisma.user.findMany({
      where: {
        currentStreak: { gt: 0 },
        lastCheckIn: { not: null }
      },
      select: {
        id: true,
        currentStreak: true,
        lastCheckIn: true
      }
    });

    let resetCount = 0;
    const now = new Date();

    for (const user of users) {
      if (!user.lastCheckIn) continue;

      const hoursSinceLastCheckIn = differenceInHours(now, user.lastCheckIn);

      if (hoursSinceLastCheckIn > 48) {
        await prisma.user.update({
          where: { id: user.id },
          data: { currentStreak: 0 }
        });

        resetCount++;
      }
    }

    logger.info('Manual streak check completed', {
      checked: users.length,
      reset: resetCount
    });

    return {
      checked: users.length,
      reset: resetCount
    };
  } catch (error) {
    logger.error('Manual streak check failed:', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}
