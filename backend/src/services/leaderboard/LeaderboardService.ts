import { PrismaClient } from '@prisma/client';
import { RedisClient } from '../../database/redis/client.js';
import { logger } from '../../utils/logger.js';
import { config } from '../../config/index.js';

// Track if sync is in progress to avoid multiple concurrent syncs
let syncInProgress = false;
let lastSyncAttempt = 0;
const SYNC_COOLDOWN_MS = 30000; // 30 seconds between sync attempts

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  telegramId: bigint;
  username?: string;
  firstName?: string;
  avatarUrl?: string;
  totalPoints: number;
  nftCount: number;
}

export interface PaginationParams {
  limit: number;
  offset: number;
}

// Mountain format interfaces
export interface MountainUser {
  rank: number;
  user_id: string;
  telegram_id: string;
  username: string | null;
  first_name: string | null;
  avatar_url: string | null;
  value: number;
  is_me?: boolean;
}

export interface MetricInfo {
  id: string;
  label: string;
  display_name: string;
}

export interface PaginationInfo {
  next_cursor: string | null;
  has_more: boolean;
  total: number;
}

export interface MountainLeaderboardResponse {
  metric: MetricInfo;
  podium: MountainUser[];
  list: MountainUser[];
  me: { rank: number; value: number } | null;
  pagination: PaginationInfo;
}

export class LeaderboardService {
  constructor(
    private prisma: PrismaClient,
    private redis: RedisClient
  ) {}

  /**
   * Trigger background sync if Redis is empty
   * This is a safety net - normally the cron job handles syncing
   */
  private async triggerSyncIfEmpty(): Promise<void> {
    // Avoid too frequent sync attempts
    const now = Date.now();
    if (syncInProgress || (now - lastSyncAttempt) < SYNC_COOLDOWN_MS) {
      return;
    }

    try {
      const client = this.redis.getClient();
      const size = await client.zcard('leaderboard');

      if (size === 0) {
        lastSyncAttempt = now;
        syncInProgress = true;

        logger.warn('Redis leaderboard is empty, triggering background sync');

        // Run sync in background (don't await)
        this.syncLeaderboardFromDB().finally(() => {
          syncInProgress = false;
        });
      }
    } catch (error) {
      logger.error('Error checking leaderboard sync status:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Sync leaderboard from PostgreSQL to Redis
   * Called automatically when Redis is detected as empty
   */
  private async syncLeaderboardFromDB(): Promise<void> {
    try {
      const startTime = Date.now();
      logger.info('Starting emergency leaderboard sync from DB');

      const users = await this.prisma.user.findMany({
        select: { id: true, totalPoints: true },
        orderBy: { totalPoints: 'desc' }
      });

      if (users.length === 0) {
        logger.info('No users to sync');
        return;
      }

      const client = this.redis.getClient();
      const pipeline = client.pipeline();

      for (const user of users) {
        pipeline.zadd('leaderboard', user.totalPoints, user.id);
      }

      await pipeline.exec();

      const duration = Date.now() - startTime;
      logger.info('Emergency leaderboard sync completed', {
        usersCount: users.length,
        duration: `${duration}ms`
      });
    } catch (error) {
      logger.error('Emergency leaderboard sync failed:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get top users from Redis sorted set (fast)
   * Falls back to PostgreSQL if Redis fails or returns insufficient results
   */
  async getTopUsers(pagination: PaginationParams): Promise<LeaderboardEntry[]> {
    try {
      const { limit, offset } = pagination;
      const start = offset;
      const end = offset + limit - 1;

      // Try to get from Redis first
      const redisEntries = await this.redis.getLeaderboard(start, end);

      // If Redis returns empty results and offset is 0, Redis is empty - fall back to PostgreSQL
      // If offset > 0 and empty, it just means we're past the end of the data - that's normal
      if (redisEntries.length === 0 && offset === 0) {
        logger.warn('Redis leaderboard empty, falling back to PostgreSQL');

        // Trigger background sync since Redis is empty
        this.triggerSyncIfEmpty();

        return await this.getTopUsersFromDB(pagination);
      }

      // If offset > 0 but Redis returned nothing, check if Redis has any data at all
      if (redisEntries.length === 0 && offset > 0) {
        const client = this.redis.getClient();
        const totalInRedis = await client.zcard('leaderboard');

        // Redis is truly empty - fall back to PostgreSQL
        if (totalInRedis === 0) {
          logger.warn('Redis leaderboard empty (checked via zcard), falling back to PostgreSQL');
          this.triggerSyncIfEmpty();
          return await this.getTopUsersFromDB(pagination);
        }

        // Redis has data but offset is past the end - return empty (normal case)
        return [];
      }

      // Enrich with user data from database
      const userIds = redisEntries.map(entry => entry.userId);
      const users = await this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          telegramId: true,
          username: true,
          firstName: true,
          avatarUrl: true,
          totalPoints: true,
          nftCount: true
        }
      });

      // Map to leaderboard entries with ranks
      const entries: LeaderboardEntry[] = [];
      redisEntries.forEach((entry, index) => {
        const user = users.find(u => u.id === entry.userId);

        if (!user) {
          logger.warn(`User not found for leaderboard entry`, { userId: entry.userId });
          return;
        }

        entries.push({
          rank: offset + index + 1,
          userId: entry.userId,
          telegramId: user.telegramId,
          username: user.username || undefined,
          firstName: user.firstName || undefined,
          avatarUrl: user.avatarUrl || undefined,
          totalPoints: entry.score,
          nftCount: user.nftCount
        });
      });

      return entries;
    } catch (error) {
      logger.error('Get top users error:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Fallback to database
      return await this.getTopUsersFromDB(pagination);
    }
  }

  /**
   * Get user's rank (1-indexed)
   * Returns null if user not found in leaderboard
   */
  async getUserRank(userId: string): Promise<number | null> {
    try {
      // Try Redis first
      const rank = await this.redis.getUserRank(userId);

      if (rank !== null) {
        return rank;
      }

      // Fallback to database
      return await this.getUserRankFromDB(userId);
    } catch (error) {
      logger.error('Get user rank error:', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Fallback to database
      return await this.getUserRankFromDB(userId);
    }
  }

  /**
   * Search users by username or firstName
   * Uses PostgreSQL ILIKE search with batch rank lookup (fixes N+1 query)
   */
  async searchUsers(query: string, limit: number): Promise<LeaderboardEntry[]> {
    try {
      const users = await this.prisma.user.findMany({
        where: {
          OR: [
            { username: { contains: query, mode: 'insensitive' } },
            { firstName: { contains: query, mode: 'insensitive' } }
          ]
        },
        select: {
          id: true,
          telegramId: true,
          username: true,
          firstName: true,
          avatarUrl: true,
          totalPoints: true,
          nftCount: true
        },
        orderBy: { totalPoints: 'desc' },
        take: limit
      });

      if (users.length === 0) {
        return [];
      }

      // Batch get ranks from Redis (fixes N+1 query problem)
      const userIds = users.map(u => u.id);
      const ranksMap = await this.redis.getUserRanksBatch(userIds);

      return users.map(user => ({
        rank: ranksMap.get(user.id) || 0,
        userId: user.id,
        telegramId: user.telegramId,
        username: user.username || undefined,
        firstName: user.firstName || undefined,
        avatarUrl: user.avatarUrl || undefined,
        totalPoints: user.totalPoints,
        nftCount: user.nftCount
      }));
    } catch (error) {
      logger.error('Search users error:', {
        query,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error('Failed to search users');
    }
  }

  /**
   * Get users around a specific rank (context)
   * E.g., if rank=50 and contextSize=5, returns ranks 45-55
   */
  async getUsersAroundRank(rank: number, contextSize: number): Promise<LeaderboardEntry[]> {
    try {
      const start = Math.max(0, rank - contextSize - 1);
      const limit = contextSize * 2 + 1;

      return await this.getTopUsers({ limit, offset: start });
    } catch (error) {
      logger.error('Get users around rank error:', {
        rank,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error('Failed to get users around rank');
    }
  }

  /**
   * Update user's position in Redis leaderboard
   * Should be called whenever user's totalPoints changes
   */
  async updateUserPosition(userId: string, totalPoints: number): Promise<void> {
    try {
      await this.redis.updateLeaderboard(userId, totalPoints);

      logger.debug('Updated leaderboard position', {
        userId,
        totalPoints
      });
    } catch (error) {
      logger.error('Update user position error:', {
        userId,
        totalPoints,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      // Don't throw - leaderboard sync job will fix it
    }
  }

  /**
   * Get total number of users in leaderboard
   */
  async getLeaderboardSize(): Promise<number> {
    try {
      const client = this.redis.getClient();
      const size = await client.zcard('leaderboard');
      return size;
    } catch (error) {
      logger.error('Get leaderboard size error:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Fallback to database count
      return await this.prisma.user.count();
    }
  }

  /**
   * Fallback: Get top users from PostgreSQL
   */
  private async getTopUsersFromDB(pagination: PaginationParams): Promise<LeaderboardEntry[]> {
    try {
      const { limit, offset } = pagination;

      const users = await this.prisma.user.findMany({
        select: {
          id: true,
          telegramId: true,
          username: true,
          firstName: true,
          avatarUrl: true,
          totalPoints: true,
          nftCount: true
        },
        orderBy: { totalPoints: 'desc' },
        skip: offset,
        take: limit
      });

      return users.map((user, index) => ({
        rank: offset + index + 1,
        userId: user.id,
        telegramId: user.telegramId,
        username: user.username || undefined,
        firstName: user.firstName || undefined,
        avatarUrl: user.avatarUrl || undefined,
        totalPoints: user.totalPoints,
        nftCount: user.nftCount
      }));
    } catch (error) {
      logger.error('Get top users from DB error:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error('Failed to get top users from database');
    }
  }

  /**
   * Fallback: Get user rank from PostgreSQL
   */
  private async getUserRankFromDB(userId: string): Promise<number | null> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { totalPoints: true }
      });

      if (!user) {
        return null;
      }

      // Count users with more points
      const count = await this.prisma.user.count({
        where: { totalPoints: { gt: user.totalPoints } }
      });

      return count + 1;
    } catch (error) {
      logger.error('Get user rank from DB error:', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  /**
   * Get mountain format leaderboard with podium (top 5) and list
   * @param currentUserId - Current user ID to mark "is_me" and return their position
   * @param cursor - Pagination cursor (offset as string)
   * @param limit - Page size for list
   * @param metricType - 'meters' for total points (default), 'stickers' for NFT count
   */
  async getMountainLeaderboard(
    currentUserId?: string,
    cursor?: string,
    limit?: number,
    metricType: 'meters' | 'stickers' = 'meters'
  ): Promise<MountainLeaderboardResponse> {
    try {
      const podiumSize = config.features.leaderboard.podiumSize;
      const pageSize = limit || config.features.leaderboard.defaultPageSize;
      const offset = cursor ? parseInt(cursor) : 0;

      // Get metric info based on type
      const metric: MetricInfo = metricType === 'stickers'
        ? { id: 'stickers', label: '🎨', display_name: 'Stickers' }
        : { id: 'meters', label: '📏', display_name: 'Meters' };

      // Get data based on metric type
      let podiumEntries: LeaderboardEntry[];
      let listEntries: LeaderboardEntry[];

      if (metricType === 'stickers') {
        podiumEntries = await this.getTopUsersByNftCount({ limit: podiumSize, offset: 0 });
        const listOffset = podiumSize + offset;
        listEntries = await this.getTopUsersByNftCount({ limit: pageSize + 1, offset: listOffset });
      } else {
        podiumEntries = await this.getTopUsers({ limit: podiumSize, offset: 0 });
        const listOffset = podiumSize + offset;
        listEntries = await this.getTopUsers({ limit: pageSize + 1, offset: listOffset });
      }

      // Check if there are more entries
      const hasMore = listEntries.length > pageSize;
      const actualListEntries = hasMore ? listEntries.slice(0, pageSize) : listEntries;

      // Get current user's rank and value
      let meData: { rank: number; value: number } | null = null;
      if (currentUserId) {
        if (metricType === 'stickers') {
          const userRank = await this.getUserRankByNftCount(currentUserId);
          if (userRank) {
            const user = await this.prisma.user.findUnique({
              where: { id: currentUserId },
              select: { nftCount: true }
            });
            if (user) {
              meData = { rank: userRank, value: user.nftCount };
            }
          }
        } else {
          const userRank = await this.getUserRank(currentUserId);
          if (userRank) {
            const user = await this.prisma.user.findUnique({
              where: { id: currentUserId },
              select: { totalPoints: true }
            });
            if (user) {
              meData = { rank: userRank, value: user.totalPoints };
            }
          }
        }
      }

      // Convert to mountain format
      const convertToMountainUser = (entry: LeaderboardEntry, isMe: boolean = false): MountainUser => ({
        rank: entry.rank,
        user_id: entry.userId,
        telegram_id: entry.telegramId.toString(),
        username: entry.username || null,
        first_name: entry.firstName || null,
        avatar_url: entry.avatarUrl || null,
        value: metricType === 'stickers' ? entry.nftCount : entry.totalPoints,
        is_me: isMe || undefined
      });

      const podium = podiumEntries.map(entry =>
        convertToMountainUser(entry, currentUserId === entry.userId)
      );

      const list = actualListEntries.map(entry =>
        convertToMountainUser(entry, currentUserId === entry.userId)
      );

      // Get total count
      const total = await this.getLeaderboardSize();

      // Calculate next cursor
      const listOffset = podiumSize + offset;
      const nextCursor = hasMore ? (listOffset + pageSize).toString() : null;

      return {
        metric,
        podium,
        list,
        me: meData,
        pagination: {
          next_cursor: nextCursor,
          has_more: hasMore,
          total
        }
      };
    } catch (error) {
      logger.error('Get mountain leaderboard error:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error('Failed to get mountain leaderboard');
    }
  }

  /**
   * Get top users sorted by NFT count
   */
  async getTopUsersByNftCount(pagination: PaginationParams): Promise<LeaderboardEntry[]> {
    try {
      const { limit, offset } = pagination;

      const users = await this.prisma.user.findMany({
        select: {
          id: true,
          telegramId: true,
          username: true,
          firstName: true,
          avatarUrl: true,
          totalPoints: true,
          nftCount: true
        },
        orderBy: { nftCount: 'desc' },
        skip: offset,
        take: limit
      });

      return users.map((user, index) => ({
        rank: offset + index + 1,
        userId: user.id,
        telegramId: user.telegramId,
        username: user.username || undefined,
        firstName: user.firstName || undefined,
        avatarUrl: user.avatarUrl || undefined,
        totalPoints: user.totalPoints,
        nftCount: user.nftCount
      }));
    } catch (error) {
      logger.error('Get top users by NFT count error:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error('Failed to get top users by NFT count');
    }
  }

  /**
   * Get user rank by NFT count
   */
  async getUserRankByNftCount(userId: string): Promise<number | null> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { nftCount: true }
      });

      if (!user) {
        return null;
      }

      // Count users with more NFTs
      const count = await this.prisma.user.count({
        where: { nftCount: { gt: user.nftCount } }
      });

      return count + 1;
    } catch (error) {
      logger.error('Get user rank by NFT count error:', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  /**
   * Get user's neighbors in leaderboard (users around their rank)
   */
  async getUserNeighbors(userId: string, neighborCount: number = 2): Promise<MountainUser[]> {
    try {
      const rank = await this.getUserRank(userId);
      if (!rank) return [];

      const entries = await this.getUsersAroundRank(rank, neighborCount);

      return entries.map(entry => ({
        rank: entry.rank,
        user_id: entry.userId,
        telegram_id: entry.telegramId.toString(),
        username: entry.username || null,
        first_name: entry.firstName || null,
        avatar_url: entry.avatarUrl || null,
        value: entry.totalPoints,
        is_me: entry.userId === userId || undefined
      }));
    } catch (error) {
      logger.error('Get user neighbors error:', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return [];
    }
  }
}
