import { PrismaClient } from '@prisma/client';
import { RedisClient } from '../../database/redis/client.js';
import { logger } from '../../utils/logger.js';

// Distributed lock config
const SYNC_LOCK_KEY = 'leaderboard:sync:lock';
const SYNC_LOCK_TTL = 300; // 5 minutes max lock time

export class LeaderboardSyncJob {
  constructor(
    private prisma: PrismaClient,
    private redis: RedisClient
  ) {}

  /**
   * Acquire distributed lock to prevent concurrent syncs
   * Uses Redis SET with NX and EX options
   */
  private async acquireLock(): Promise<boolean> {
    try {
      const client = this.redis.getClient();
      const lockId = `${process.pid}-${Date.now()}`;

      // SET key value EX seconds NX - only set if not exists
      const result = await client.set(SYNC_LOCK_KEY, lockId, 'EX', SYNC_LOCK_TTL, 'NX');

      return result === 'OK';
    } catch (error) {
      logger.error('Failed to acquire sync lock:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Release distributed lock
   */
  private async releaseLock(): Promise<void> {
    try {
      const client = this.redis.getClient();
      await client.del(SYNC_LOCK_KEY);
    } catch (error) {
      logger.error('Failed to release sync lock:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Sync leaderboard from PostgreSQL to Redis
   * Runs periodically (every 5 minutes) to ensure consistency
   * Uses distributed lock to prevent concurrent syncs in multi-instance deployments
   */
  async syncLeaderboard(): Promise<void> {
    // Try to acquire distributed lock
    const lockAcquired = await this.acquireLock();
    if (!lockAcquired) {
      logger.info('Leaderboard sync skipped - another instance is syncing');
      return;
    }

    try {
      const startTime = Date.now();
      logger.info('Starting leaderboard sync');

      // Get all users with their scores (including those with 0 points)
      const users = await this.prisma.user.findMany({
        select: {
          id: true,
          totalPoints: true
        },
        orderBy: {
          totalPoints: 'desc'
        }
      });

      if (users.length === 0) {
        logger.info('No users to sync');
        return;
      }

      // Use Redis pipeline for batch updates
      const client = this.redis.getClient();
      const pipeline = client.pipeline();

      // Add all users to leaderboard
      for (const user of users) {
        pipeline.zadd('leaderboard', user.totalPoints, user.id);
      }

      // Execute pipeline
      await pipeline.exec();

      const duration = Date.now() - startTime;

      logger.info('Leaderboard sync completed', {
        usersCount: users.length,
        duration: `${duration}ms`
      });
    } catch (error) {
      logger.error('Leaderboard sync failed:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      // Always release the lock
      await this.releaseLock();
    }
  }

  /**
   * Rebuild entire leaderboard from scratch
   * Deletes old data and rebuilds
   * Use this for maintenance or if Redis data is corrupted
   */
  async rebuildLeaderboard(): Promise<void> {
    try {
      const startTime = Date.now();
      logger.info('Starting leaderboard rebuild');

      const client = this.redis.getClient();

      // Delete old leaderboard
      await client.del('leaderboard');
      logger.info('Old leaderboard deleted');

      // Rebuild
      await this.syncLeaderboard();

      const duration = Date.now() - startTime;

      logger.info('Leaderboard rebuild completed', {
        duration: `${duration}ms`
      });
    } catch (error) {
      logger.error('Leaderboard rebuild failed:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Sync single user to leaderboard
   * Use this when user's points change
   */
  async syncUser(userId: string): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { totalPoints: true }
      });

      if (!user) {
        logger.warn('User not found for sync', { userId });
        return;
      }

      await this.redis.updateLeaderboard(userId, user.totalPoints);

      logger.debug('User synced to leaderboard', {
        userId,
        totalPoints: user.totalPoints
      });
    } catch (error) {
      logger.error('User sync failed:', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      // Don't throw - not critical
    }
  }

  /**
   * Remove user from leaderboard
   * Use this when user is deleted or banned
   */
  async removeUser(userId: string): Promise<void> {
    try {
      const client = this.redis.getClient();
      await client.zrem('leaderboard', userId);

      logger.info('User removed from leaderboard', { userId });
    } catch (error) {
      logger.error('Failed to remove user from leaderboard:', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get sync statistics
   */
  async getSyncStats(): Promise<{
    redisCount: number;
    dbCount: number;
    inSync: boolean;
  }> {
    try {
      const client = this.redis.getClient();

      // Count in Redis
      const redisCount = await client.zcard('leaderboard');

      // Count in database (all users)
      const dbCount = await this.prisma.user.count();

      const inSync = redisCount === dbCount;

      return {
        redisCount,
        dbCount,
        inSync
      };
    } catch (error) {
      logger.error('Failed to get sync stats:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Verify leaderboard integrity
   * Check if Redis and PostgreSQL are in sync
   */
  async verifyIntegrity(): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    try {
      const errors: string[] = [];

      // Check counts
      const stats = await this.getSyncStats();

      if (!stats.inSync) {
        errors.push(`Count mismatch: Redis=${stats.redisCount}, DB=${stats.dbCount}`);
      }

      // Sample check: verify top 10 users
      const topUsers = await this.prisma.user.findMany({
        select: { id: true, totalPoints: true },
        orderBy: { totalPoints: 'desc' },
        take: 10
      });

      for (const user of topUsers) {
        const redisScore = await this.redis.getUserScore(user.id);

        if (redisScore === null) {
          errors.push(`User ${user.id} not in Redis`);
        } else if (redisScore !== user.totalPoints) {
          errors.push(`Score mismatch for user ${user.id}: Redis=${redisScore}, DB=${user.totalPoints}`);
        }
      }

      const isValid = errors.length === 0;

      logger.info('Integrity check completed', {
        isValid,
        errorsCount: errors.length
      });

      return {
        isValid,
        errors
      };
    } catch (error) {
      logger.error('Integrity check failed:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
}
