import cron from 'node-cron';
import { logger } from '../utils/logger.js';
import { prisma } from '../database/prisma/client.js';
import { redis } from '../database/redis/client.js';
import { LeaderboardSyncJob } from '../services/leaderboard/LeaderboardSyncJob.js';

/**
 * Leaderboard sync background job
 * Syncs PostgreSQL → Redis every 5 minutes
 * Ensures leaderboard data is up-to-date
 */
export function startLeaderboardSyncJob() {
  const syncJob = new LeaderboardSyncJob(prisma, redis);

  // Run every 5 minutes
  const cronExpression = '*/5 * * * *';

  cron.schedule(cronExpression, async () => {
    try {
      logger.info('Starting leaderboard sync job');
      await syncJob.syncLeaderboard();
      logger.info('Leaderboard sync job completed');
    } catch (error) {
      logger.error('Leaderboard sync job failed:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  logger.info('Leaderboard sync job scheduled (every 5 minutes)');

  // Run initial sync on startup
  setTimeout(async () => {
    try {
      logger.info('Running initial leaderboard sync');
      await syncJob.syncLeaderboard();
      logger.info('Initial leaderboard sync completed');
    } catch (error) {
      logger.error('Initial leaderboard sync failed:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }, 5000); // Wait 5 seconds after startup
}

/**
 * Rebuild leaderboard (manual trigger)
 */
export async function rebuildLeaderboard() {
  const syncJob = new LeaderboardSyncJob(prisma, redis);

  try {
    logger.info('Rebuilding leaderboard (manual trigger)');
    await syncJob.rebuildLeaderboard();
    logger.info('Leaderboard rebuild completed');
  } catch (error) {
    logger.error('Leaderboard rebuild failed:', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}
