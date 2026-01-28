import { Router } from 'express';
import { validate, schemas } from '../middleware/validation.js';
import { optionalAuthMiddleware, AuthRequest } from '../middleware/auth.js';
import { logger } from '../../utils/logger.js';
import { prisma } from '../../database/prisma/client.js';
import { redis } from '../../database/redis/client.js';
import { LeaderboardService } from '../../services/leaderboard/LeaderboardService.js';
import { config } from '../../config/index.js';

const router = Router();

// Initialize service
const leaderboardService = new LeaderboardService(prisma, redis);

/**
 * GET /api/leaderboard
 * Get top users (paginated)
 */
router.get('/',
  validate(schemas.pagination),
  optionalAuthMiddleware,
  async (req: AuthRequest, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      const entries = await leaderboardService.getTopUsers({ limit, offset });

      // Get total count
      const totalCount = await leaderboardService.getLeaderboardSize();

      res.json({
        leaderboard: entries.map(entry => ({
          rank: entry.rank,
          userId: entry.userId,
          telegramId: entry.telegramId.toString(),
          username: entry.username,
          firstName: entry.firstName,
          totalPoints: entry.totalPoints,
          nftCount: entry.nftCount
        })),
        pagination: {
          limit,
          offset,
          total: entries.length,
          totalCount
        }
      });
    } catch (error) {
      logger.error('Get leaderboard error:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get leaderboard'
      });
    }
  }
);

/**
 * GET /api/leaderboard/rank/:telegramId
 * Get user's rank with context (surrounding users)
 */
router.get('/rank/:telegramId',
  validate(schemas.telegramId),
  async (req: AuthRequest, res) => {
    try {
      const { telegramId } = req.params;

      const user = await prisma.user.findUnique({
        where: { telegramId: BigInt(telegramId) },
        select: { id: true, telegramId: true, username: true, firstName: true, totalPoints: true, nftCount: true }
      });

      if (!user) {
        res.status(404).json({
          error: 'Not Found',
          message: 'User not found'
        });
        return;
      }

      const rank = await leaderboardService.getUserRank(user.id);

      if (rank === null) {
        res.json({
          rank: null,
          message: 'User not ranked yet (0 points)',
          user: {
            userId: user.id,
            telegramId: user.telegramId.toString(),
            username: user.username,
            firstName: user.firstName,
            totalPoints: user.totalPoints,
            nftCount: user.nftCount
          }
        });
        return;
      }

      // Get users around this rank (±5 positions)
      const context = await leaderboardService.getUsersAroundRank(rank, 5);

      res.json({
        rank,
        user: {
          userId: user.id,
          telegramId: user.telegramId.toString(),
          username: user.username,
          firstName: user.firstName,
          totalPoints: user.totalPoints,
          nftCount: user.nftCount
        },
        context: context.map(entry => ({
          rank: entry.rank,
          userId: entry.userId,
          telegramId: entry.telegramId.toString(),
          username: entry.username,
          firstName: entry.firstName,
          totalPoints: entry.totalPoints,
          nftCount: entry.nftCount
        }))
      });
    } catch (error) {
      logger.error('Get rank error:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get user rank'
      });
    }
  }
);

/**
 * GET /api/leaderboard/search
 * Search users by username or first name
 */
router.get('/search',
  validate(schemas.search),
  async (req: AuthRequest, res) => {
    try {
      const query = req.query.query as string;
      const limit = parseInt(req.query.limit as string) || 10;

      const results = await leaderboardService.searchUsers(query, limit);

      res.json({
        results: results.map(entry => ({
          rank: entry.rank,
          userId: entry.userId,
          telegramId: entry.telegramId.toString(),
          username: entry.username,
          firstName: entry.firstName,
          totalPoints: entry.totalPoints,
          nftCount: entry.nftCount
        })),
        query,
        count: results.length
      });
    } catch (error) {
      logger.error('Search error:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to search users'
      });
    }
  }
);

/**
 * GET /api/leaderboard/top/:count
 * Get top N users (shortcut endpoint)
 */
router.get('/top/:count',
  async (req: AuthRequest, res) => {
    try {
      const count = parseInt(req.params.count);

      if (isNaN(count) || count < 1 || count > 100) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Count must be between 1 and 100'
        });
        return;
      }

      const entries = await leaderboardService.getTopUsers({ limit: count, offset: 0 });

      res.json({
        top: entries.map(entry => ({
          rank: entry.rank,
          userId: entry.userId,
          telegramId: entry.telegramId.toString(),
          username: entry.username,
          firstName: entry.firstName,
          totalPoints: entry.totalPoints,
          nftCount: entry.nftCount
        })),
        count: entries.length
      });
    } catch (error) {
      logger.error('Get top users error:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get top users'
      });
    }
  }
);

/**
 * GET /api/leaderboard/mountain
 * Get mountain format leaderboard with podium (top 5) and list
 * Feature flag controlled: LEADERBOARD_MOUNTAIN_ENABLED
 */
router.get('/mountain',
  optionalAuthMiddleware,
  async (req: AuthRequest, res) => {
    try {
      // Check feature flag
      if (!config.features.leaderboard.mountainEnabled) {
        res.status(404).json({
          error: 'Not Found',
          message: 'Mountain leaderboard is not enabled'
        });
        return;
      }

      const cursor = req.query.cursor as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const metric = (req.query.metric as string) || 'meters'; // 'meters' or 'stickers'

      // Get current user ID if authenticated
      let currentUserId: string | undefined;
      if (req.user?.telegramId) {
        const user = await prisma.user.findUnique({
          where: { telegramId: BigInt(req.user.telegramId) },
          select: { id: true }
        });
        currentUserId = user?.id;
      }

      const result = await leaderboardService.getMountainLeaderboard(
        currentUserId,
        cursor,
        limit,
        metric as 'meters' | 'stickers'
      );

      res.json(result);
    } catch (error) {
      logger.error('Get mountain leaderboard error:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get mountain leaderboard'
      });
    }
  }
);

/**
 * GET /api/leaderboard/me
 * Get current user's position with neighbors
 */
router.get('/me',
  optionalAuthMiddleware,
  async (req: AuthRequest, res) => {
    try {
      if (!req.user?.telegramId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required'
        });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { telegramId: BigInt(req.user.telegramId) },
        select: { id: true, totalPoints: true, username: true, firstName: true }
      });

      if (!user) {
        res.status(404).json({
          error: 'Not Found',
          message: 'User not found'
        });
        return;
      }

      const rank = await leaderboardService.getUserRank(user.id);
      const neighbors = await leaderboardService.getUserNeighbors(user.id, 2);

      const metric = config.features.leaderboard.metric;

      res.json({
        metric: {
          id: metric,
          label: metric === 'meters' ? 'm' : 'pts',
          display_name: metric === 'meters' ? 'Meters' : 'Points'
        },
        me: {
          rank: rank || null,
          value: user.totalPoints,
          username: user.username,
          first_name: user.firstName
        },
        neighbors
      });
    } catch (error) {
      logger.error('Get my position error:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get user position'
      });
    }
  }
);

/**
 * GET /api/leaderboard/config
 * Get leaderboard configuration (feature flags)
 */
router.get('/config',
  async (_req: AuthRequest, res) => {
    try {
      res.json({
        mountain_enabled: config.features.leaderboard.mountainEnabled,
        metric: config.features.leaderboard.metric,
        podium_size: config.features.leaderboard.podiumSize,
        page_size: config.features.leaderboard.defaultPageSize
      });
    } catch (error) {
      logger.error('Get leaderboard config error:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get leaderboard config'
      });
    }
  }
);

export default router;
