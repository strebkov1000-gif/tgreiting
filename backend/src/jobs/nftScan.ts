import cron from 'node-cron';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
import { prisma } from '../database/prisma/client.js';
import { NftScannerService } from '../services/ton/NftScannerService.js';
import { PointsService } from '../services/points/PointsService.js';

/**
 * NFT scan background job
 * Scans all connected wallets for NFTs every N hours (configurable)
 * Default: Every 6 hours
 */
export function startNftScanJob() {
  const pointsService = new PointsService(prisma);
  const nftScannerService = new NftScannerService(prisma, pointsService);

  // Get interval from config (default: 6 hours)
  const intervalHours = config.jobs?.nftScanIntervalHours || 6;

  // Cron expression: run every N hours at minute 0
  const cronExpression = `0 */${intervalHours} * * *`;

  cron.schedule(cronExpression, async () => {
    try {
      logger.info('Starting background NFT scan job');

      // Get all users with connected wallets
      const users = await prisma.user.findMany({
        where: {
          walletAddress: { not: null }
        },
        select: {
          id: true,
          walletAddress: true,
          telegramId: true
        }
      });

      logger.info(`NFT scan: Found ${users.length} users with wallets`);

      let successCount = 0;
      let errorCount = 0;

      for (const user of users) {
        try {
          // Scan user's wallet
          const result = await nftScannerService.updateUserNfts(
            user.id,
            user.walletAddress!
          );

          if (result.nftsAdded > 0 || result.nftsRemoved > 0) {
            logger.info('NFT scan: Changes detected', {
              userId: user.id,
              telegramId: user.telegramId.toString(),
              added: result.nftsAdded,
              removed: result.nftsRemoved,
              points: result.pointsAwarded
            });
          }

          successCount++;

          // Add delay to avoid rate limits (2 seconds between requests)
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          errorCount++;
          logger.error('NFT scan failed for user:', {
            userId: user.id,
            telegramId: user.telegramId.toString(),
            error: error instanceof Error ? error.message : 'Unknown error'
          });

          // Continue with next user even if one fails
          // Add longer delay after error to avoid rate limit issues
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }

      logger.info('Background NFT scan job completed', {
        total: users.length,
        success: successCount,
        errors: errorCount
      });
    } catch (error) {
      logger.error('NFT scan job failed:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  logger.info(`NFT scan job scheduled (every ${intervalHours} hours)`);
}

/**
 * Scan specific user's wallet (manual trigger)
 */
export async function scanUserWallet(userId: string): Promise<any> {
  const pointsService = new PointsService(prisma);
  const nftScannerService = new NftScannerService(prisma, pointsService);

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { walletAddress: true }
    });

    if (!user?.walletAddress) {
      throw new Error('User has no wallet connected');
    }

    logger.info('Manual NFT scan triggered', { userId });

    const result = await nftScannerService.updateUserNfts(userId, user.walletAddress);

    logger.info('Manual NFT scan completed', {
      userId,
      result
    });

    return result;
  } catch (error) {
    logger.error('Manual NFT scan failed:', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}
