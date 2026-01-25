import { logger } from '../utils/logger.js';
import { startLeaderboardSyncJob } from './leaderboardSync.js';
import { startNftScanJob } from './nftScan.js';
import { startStreakCheckerJob } from './streakChecker.js';

/**
 * Start all background jobs
 * Called from main index.ts on server startup
 */
export function startBackgroundJobs() {
  logger.info('Starting background jobs');

  try {
    // Start leaderboard sync job (every 5 minutes)
    startLeaderboardSyncJob();

    // Start NFT scan job (every 6 hours)
    startNftScanJob();

    // Start streak checker job (daily at 00:00 UTC)
    startStreakCheckerJob();

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
