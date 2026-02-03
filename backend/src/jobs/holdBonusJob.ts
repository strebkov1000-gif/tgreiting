import cron from 'node-cron';
import { logger } from '../utils/logger.js';
import { prisma } from '../database/prisma/client.js';
import { HoldBonusService } from '../services/holdbonus/HoldBonusService.js';
import { PointsService } from '../services/points/PointsService.js';

/**
 * Hold Bonus background job
 * Calculates and awards hold bonuses daily
 *
 * Schedule: Every day at 00:05 UTC
 * (5 minutes after midnight to avoid conflicts with other daily jobs)
 *
 * What it does:
 * 1. For each user with NFTs, check how long they've held each NFT
 * 2. Award +10% bonus for each month of holding (per NFT)
 * 3. Award Diamond Hands (+500m) if any NFT held 6+ months (one-time)
 */
export function startHoldBonusJob() {
  const pointsService = new PointsService(prisma);
  const holdBonusService = new HoldBonusService(prisma, pointsService);

  // Run daily at 00:05 UTC
  const cronExpression = '5 0 * * *';

  cron.schedule(cronExpression, async () => {
    try {
      logger.info('Starting daily hold bonus calculation job');

      const startTime = Date.now();

      const stats = await holdBonusService.calculateAndAwardHoldBonusForAll();

      const duration = Date.now() - startTime;

      logger.info('Daily hold bonus job completed', {
        ...stats,
        durationMs: duration
      });
    } catch (error) {
      logger.error('Hold bonus job failed:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  logger.info('Hold bonus job scheduled (daily at 00:05 UTC)');
}

/**
 * Manually trigger hold bonus calculation for a specific user
 * Useful for testing or admin actions
 */
export async function calculateUserHoldBonus(userId: string) {
  const pointsService = new PointsService(prisma);
  const holdBonusService = new HoldBonusService(prisma, pointsService);

  logger.info('Manual hold bonus calculation triggered', { userId });

  const result = await holdBonusService.calculateAndAwardHoldBonus(userId);

  logger.info('Manual hold bonus calculation completed', {
    targetUserId: userId,
    ...result
  });

  return result;
}

/**
 * Manually trigger hold bonus calculation for ALL users
 * Useful for initial setup or fixing discrepancies
 */
export async function calculateAllHoldBonuses() {
  const pointsService = new PointsService(prisma);
  const holdBonusService = new HoldBonusService(prisma, pointsService);

  logger.info('Manual hold bonus calculation for all users triggered');

  const stats = await holdBonusService.calculateAndAwardHoldBonusForAll();

  logger.info('Manual hold bonus calculation for all users completed', stats);

  return stats;
}
