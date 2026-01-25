import { Router } from 'express';
import { authMiddleware, optionalAuthMiddleware, AuthRequest } from '../middleware/auth.js';
import { validate, schemas } from '../middleware/validation.js';
import { logger } from '../../utils/logger.js';
import { prisma } from '../../database/prisma/client.js';
import { redis } from '../../database/redis/client.js';

// Services
import { PointsService } from '../../services/points/PointsService.js';
import { CheckinService } from '../../services/points/CheckinService.js';
import { LeaderboardService } from '../../services/leaderboard/LeaderboardService.js';
import { WalletService } from '../../services/ton/WalletService.js';
import { TonConnectService } from '../../services/ton/TonConnectService.js';
import { NftScannerService } from '../../services/ton/NftScannerService.js';
import { AchievementChecker } from '../../services/achievements/AchievementChecker.js';
import { AchievementService } from '../../services/achievements/AchievementService.js';

const router = Router();

// Initialize services
const pointsService = new PointsService(prisma);
const checkinService = new CheckinService(prisma, pointsService);
const leaderboardService = new LeaderboardService(prisma, redis);
const achievementService = new AchievementService(prisma, pointsService);
const achievementChecker = new AchievementChecker(prisma, achievementService);
const tonConnectService = new TonConnectService();
const nftScannerService = new NftScannerService(prisma, pointsService);
const walletService = new WalletService(prisma, tonConnectService, nftScannerService);

/**
 * GET /api/user/:telegramId
 * Get user profile by Telegram ID
 */
router.get('/:telegramId',
  validate(schemas.telegramId),
  optionalAuthMiddleware,
  async (req: AuthRequest, res) => {
    try {
      const { telegramId } = req.params;

      const user = await prisma.user.findUnique({
        where: { telegramId: BigInt(telegramId) },
        include: {
          _count: {
            select: {
              nfts: true,
              achievements: true,
              referrals: true
            }
          },
          referrer: {
            select: {
              username: true,
              firstName: true
            }
          }
        }
      });

      if (!user) {
        res.status(404).json({
          error: 'Not Found',
          message: 'User not found'
        });
        return;
      }

      // Get user's rank
      const rank = await leaderboardService.getUserRank(user.id);

      res.json({
        user: {
          id: user.id,
          telegramId: user.telegramId.toString(),
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          walletAddress: user.walletAddress,
          totalPoints: user.totalPoints,
          nftCount: user.nftCount,
          currentStreak: user.currentStreak,
          maxStreak: user.maxStreak,
          referralCode: user.referralCode,
          referredBy: user.referrer ? {
            username: user.referrer.username,
            firstName: user.referrer.firstName
          } : null,
          joinedAt: user.joinedAt,
          lastCheckIn: user.lastCheckIn,
          isPremium: user.isPremium,
          rank,
          counts: {
            nfts: user._count.nfts,
            achievements: user._count.achievements,
            referrals: user._count.referrals
          }
        }
      });
    } catch (error) {
      logger.error('Get user error:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get user profile'
      });
    }
  }
);

/**
 * POST /api/user/checkin
 * Perform daily check-in
 */
router.post('/checkin',
  authMiddleware,
  async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;

      // Perform check-in
      const result = await checkinService.performCheckin(userId);

      // Get user's new rank
      const rank = await leaderboardService.getUserRank(userId);

      // Update leaderboard
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { totalPoints: true }
      });

      if (user) {
        await leaderboardService.updateUserPosition(userId, user.totalPoints);
      }

      // Check for achievements
      const achievementUnlocks = await achievementChecker.checkUserAchievements(userId, rank);

      res.json({
        success: result.success,
        points: result.points,
        currentStreak: result.currentStreak,
        isNewRecord: result.isNewRecord,
        nextCheckInAvailable: result.nextCheckInAvailable,
        rank,
        achievements: achievementUnlocks.length > 0 ? achievementUnlocks : undefined
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('Already checked in')) {
        res.status(400).json({
          error: 'Bad Request',
          message: error.message
        });
        return;
      }

      logger.error('Check-in error:', {
        userId: req.user!.userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to perform check-in'
      });
    }
  }
);

/**
 * PUT /api/user/wallet
 * Connect or update TON wallet
 */
router.put('/wallet',
  authMiddleware,
  validate(schemas.tonProof),
  async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;
      const { proof } = req.body;

      // Connect wallet (includes NFT scan)
      const result = await walletService.connectWallet(userId, proof);

      // Get user's new rank and total points
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { totalPoints: true }
      });

      const rank = await leaderboardService.getUserRank(userId);

      // Update leaderboard if points changed
      if (user && result.nftScanResult.pointsAwarded > 0) {
        await leaderboardService.updateUserPosition(userId, user.totalPoints);
      }

      // Check for achievements (NFT-related)
      const achievementUnlocks = await achievementChecker.checkUserAchievements(userId, rank);

      res.json({
        success: true,
        walletAddress: result.walletAddress,
        nftScanResult: result.nftScanResult,
        rank,
        achievements: achievementUnlocks.length > 0 ? achievementUnlocks : undefined
      });
    } catch (error) {
      logger.error('Connect wallet error:', {
        userId: req.user!.userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to connect wallet'
      });
    }
  }
);

/**
 * DELETE /api/user/wallet
 * Disconnect TON wallet
 */
router.delete('/wallet',
  authMiddleware,
  async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;

      await walletService.disconnectWallet(userId);

      res.json({
        success: true,
        message: 'Wallet disconnected successfully'
      });
    } catch (error) {
      logger.error('Disconnect wallet error:', {
        userId: req.user!.userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to disconnect wallet'
      });
    }
  }
);

/**
 * GET /api/user/:telegramId/stats
 * Get detailed user statistics
 */
router.get('/:telegramId/stats',
  validate(schemas.telegramId),
  async (req: AuthRequest, res) => {
    try {
      const { telegramId } = req.params;

      const user = await prisma.user.findUnique({
        where: { telegramId: BigInt(telegramId) }
      });

      if (!user) {
        res.status(404).json({
          error: 'Not Found',
          message: 'User not found'
        });
        return;
      }

      // Get points breakdown
      const pointsByType = await pointsService.getPointsByActivityType(user.id);

      // Get recent activity
      const recentActivity = await pointsService.getUserPointHistory(user.id, 10, 0);

      // Get streak stats
      const streakStats = await checkinService.getStreakStats(user.id);

      // Get rank
      const rank = await leaderboardService.getUserRank(user.id);

      // Calculate streak multiplier
      const calculateStreakMultiplier = (streak: number): number => {
        if (streak >= 30) return 2.0;
        if (streak >= 7) return 1.5;
        return 1.0;
      };

      res.json({
        stats: {
          totalPoints: user.totalPoints,
          pointsByType,
          recentActivity: recentActivity.map(activity => ({
            id: activity.id,
            points: activity.points,
            activityType: activity.activityType,
            description: activity.description,
            createdAt: activity.createdAt,
            metadata: activity.metadata
          })),
          streakStats: {
            current: streakStats.currentStreak,
            max: streakStats.maxStreak,
            multiplier: streakStats.multiplier,
            canCheckIn: streakStats.canCheckIn,
            nextCheckIn: streakStats.nextCheckIn
          },
          rank,
          nftCount: user.nftCount
        }
      });
    } catch (error) {
      logger.error('Get stats error:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get user statistics'
      });
    }
  }
);

/**
 * GET /api/user/:telegramId/wallet
 * Get wallet info
 */
router.get('/:telegramId/wallet',
  validate(schemas.telegramId),
  async (req: AuthRequest, res) => {
    try {
      const { telegramId } = req.params;

      const user = await prisma.user.findUnique({
        where: { telegramId: BigInt(telegramId) },
        select: { id: true }
      });

      if (!user) {
        res.status(404).json({
          error: 'Not Found',
          message: 'User not found'
        });
        return;
      }

      const walletInfo = await walletService.getWalletInfo(user.id);

      res.json({
        wallet: walletInfo
      });
    } catch (error) {
      logger.error('Get wallet info error:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get wallet info'
      });
    }
  }
);

export default router;
