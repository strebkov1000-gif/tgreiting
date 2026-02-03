import cron from 'node-cron';
import { logger } from '../utils/logger.js';
import { prisma } from '../database/prisma/client.js';
import { NftScannerService } from '../services/ton/NftScannerService.js';
import { PointsService } from '../services/points/PointsService.js';

/**
 * Ownership Date background job
 * Updates ownedSince dates for NFTs in background
 *
 * Schedule: Every hour
 * Batch size: 30 NFTs per run (to avoid rate limiting)
 *
 * Why needed:
 * - Initial NFT scan is fast (doesn't fetch ownership dates)
 * - This job fills in the real dates from blockchain
 * - Hold bonus calculations use these dates
 */
export function startOwnershipDateJob() {
  const pointsService = new PointsService(prisma);
  const scannerService = new NftScannerService(prisma, pointsService);

  // Run every hour at minute 30
  const cronExpression = '30 * * * *';

  cron.schedule(cronExpression, async () => {
    try {
      logger.info('Starting ownership date update job');

      const startTime = Date.now();

      // Process 30 NFTs per run to avoid rate limiting
      const result = await scannerService.updateOwnershipDatesBackground(30);

      const duration = Date.now() - startTime;

      logger.info('Ownership date update job completed', {
        ...result,
        durationMs: duration
      });
    } catch (error) {
      logger.error('Ownership date job failed:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  logger.info('Ownership date job scheduled (every hour at :30)');
}
