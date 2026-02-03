import { logger } from '../utils/logger.js';
import { startLeaderboardSyncJob } from './leaderboardSync.js';
import { startNftScanJob } from './nftScan.js';
import { startStreakCheckerJob } from './streakChecker.js';
import { startHoldBonusJob } from './holdBonusJob.js';
import { startOwnershipDateJob } from './ownershipDateJob.js';

/**
 * Start all background jobs
 * Called from main index.ts on server startup
 */
export function startBackgroundJobs() {
  logger.info('Starting background jobs');

  try {
    // Start leaderboard sync job (every 5 minutes)
    startLeaderboardSyncJob();

    // DISABLED: NFT scan will be enabled at end of season manually
    // startNftScanJob();

    // Start streak checker job (daily at 00:00 UTC)
    startStreakCheckerJob();

    // DISABLED: Hold bonus will be calculated at end of season manually
    // startHoldBonusJob();

    // DISABLED: Ownership dates will be fetched at end of season
    // startOwnershipDateJob();

    logger.info('All background jobs started successfully');
  } catch (error) {
    logger.error('Failed to start background jobs:', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Stop all background jobs
 * (For graceful shutdown)
 */
export function stopBackgroundJobs() {
  logger.info('Stopping background jobs');
  // node-cron automatically stops when process exits
  // Add any cleanup logic here if needed
}
