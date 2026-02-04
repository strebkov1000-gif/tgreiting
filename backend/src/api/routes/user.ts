import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authMiddleware, optionalAuthMiddleware, AuthRequest } from '../middleware/auth.js';
import { validate, schemas } from '../middleware/validation.js';
import { logger } from '../../utils/logger.js';
import { prisma } from '../../database/prisma/client.js';
import { redis } from '../../database/redis/client.js';
import { telegramBot } from '../../bot/index.js';
import { calculateClubBoost, CLUB_CONFIGS } from '../../utils/clubBoosts.js';

// Services
import { PointsService } from '../../services/points/PointsService.js';
import { CheckinService } from '../../services/points/CheckinService.js';
import { LeaderboardService } from '../../services/leaderboard/LeaderboardService.js';
import { WalletService } from '../../services/ton/WalletService.js';
import { TonConnectService } from '../../services/ton/TonConnectService.js';
import { NftScannerService } from '../../services/ton/NftScannerService.js';
import { AchievementChecker } from '../../services/achievements/AchievementChecker.js';
import { AchievementService } from '../../services/achievements/AchievementService.js';
import { ReferralRewardService } from '../../services/referral/ReferralRewardService.js';
import { HoldBonusService } from '../../services/holdbonus/HoldBonusService.js';

const router = Router();

// Initialize services
const pointsService = new PointsService(prisma);
const checkinService = new CheckinService(prisma, pointsService);
const leaderboardService = new LeaderboardService(prisma, redis);
const achievementService = new AchievementService(prisma, pointsService);
const achievementChecker = new AchievementChecker(prisma, achievementService);
const referralRewardService = new ReferralRewardService(prisma);
const tonConnectService = new TonConnectService();
const nftScannerService = new NftScannerService(prisma, pointsService);
const walletService = new WalletService(prisma, tonConnectService, nftScannerService);
const holdBonusService = new HoldBonusService(prisma, pointsService);

// Rate limiter for check-in endpoint (prevent spam)
const checkinLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 attempts per minute (generous for legitimate use, blocks spam)
  message: { error: 'Too Many Requests', message: 'Please wait before checking in again' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: AuthRequest) => req.user?.telegramId?.toString() || req.ip || 'unknown'
});

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
  checkinLimiter,
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

        // Check if user reached level 2 and trigger referral rewards
        await referralRewardService.checkAndAwardReferralRewards(userId, leaderboardService);
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
 * Connect or update TON wallet with proof verification
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

      // Get user's total points after scan
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { totalPoints: true }
      });

      // Update leaderboard FIRST if points changed
      if (user && result.nftScanResult.pointsAwarded > 0) {
        await leaderboardService.updateUserPosition(userId, user.totalPoints);
      }

      // Get rank AFTER leaderboard is updated
      const rank = await leaderboardService.getUserRank(userId);

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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Check if wallet is already connected to another account
      if (errorMessage.includes('already connected to another account')) {
        logger.warn('Wallet already connected to another account (PUT)', {
          userId: req.user!.userId
        });

        res.status(409).json({
          error: 'Wallet Already Used',
          code: 'WALLET_ALREADY_CONNECTED',
          message: 'Этот кошелек уже подключен к другому аккаунту'
        });
        return;
      }

      // SECURITY: Log full error internally but don't expose to client
      logger.error('Connect wallet error:', {
        userId: req.user!.userId,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to connect wallet'
      });
    }
  }
);

/**
 * POST /api/user/wallet
 * Simple wallet connection (without TON proof)
 * Used when TON Connect UI already verified wallet ownership
 */
router.post('/wallet',
  authMiddleware,
  async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;
      const { walletAddress } = req.body;

      if (!walletAddress) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Wallet address is required'
        });
        return;
      }

      // Connect wallet (includes NFT scan)
      const result = await walletService.connectWalletSimple(userId, walletAddress);

      // Get user's total points after scan
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { totalPoints: true }
      });

      // Update leaderboard FIRST if points changed
      if (user && result.nftScanResult.pointsAwarded > 0) {
        await leaderboardService.updateUserPosition(userId, user.totalPoints);
      }

      // Get rank AFTER leaderboard is updated
      const rank = await leaderboardService.getUserRank(userId);

      // Check for achievements
      const achievementUnlocks = await achievementChecker.checkUserAchievements(userId, rank);

      res.json({
        success: true,
        walletAddress: result.walletAddress,
        nftScanResult: result.nftScanResult,
        rank,
        achievements: achievementUnlocks.length > 0 ? achievementUnlocks : undefined
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Check if wallet is already connected to another account
      if (errorMessage.includes('already connected to another account')) {
        logger.warn('Wallet already connected to another account (POST)', {
          userId: req.user!.userId
        });

        res.status(409).json({
          error: 'Wallet Already Used',
          code: 'WALLET_ALREADY_CONNECTED',
          message: 'Этот кошелек уже подключен к другому аккаунту'
        });
        return;
      }

      logger.error('Connect wallet error (POST):', {
        userId: req.user!.userId,
        error: errorMessage
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to connect wallet'
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
 * SECURITY: Requires authentication and owner verification
 */
router.get('/:telegramId/stats',
  authMiddleware,
  validate(schemas.telegramId),
  async (req: AuthRequest, res) => {
    // Verify user is requesting their own data
    if (req.user!.telegramId.toString() !== req.params.telegramId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You can only view your own statistics'
      });
      return;
    }
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
 * SECURITY: Requires authentication and owner verification
 */
router.get('/:telegramId/wallet',
  authMiddleware,
  validate(schemas.telegramId),
  async (req: AuthRequest, res) => {
    // Verify user is requesting their own data
    if (req.user!.telegramId.toString() !== req.params.telegramId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You can only view your own wallet info'
      });
      return;
    }
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

/**
 * GET /api/user/:telegramId/extended
 * Get extended user profile with hold days and clubs info
 * Used by wallet scan progress UI
 * SECURITY: Requires authentication and owner verification
 */
router.get('/:telegramId/extended',
  authMiddleware,
  validate(schemas.telegramId),
  async (req: AuthRequest, res) => {
    // Verify user is requesting their own data
    if (req.user!.telegramId.toString() !== req.params.telegramId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You can only view your own profile'
      });
      return;
    }
    try {
      const { telegramId } = req.params;

      const user = await prisma.user.findUnique({
        where: { telegramId: BigInt(telegramId) },
        include: {
          nfts: {
            select: {
              detectedAt: true,
              ownedSince: true, // Actual blockchain ownership date
              pointsAwarded: true
            }
          },
          chatMemberships: {
            where: { isActive: true },
            select: {
              chatId: true,
              joinedAt: true
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

      // Calculate hold days (from earliest blockchain ownership date)
      let holdDays = 0;
      if (user.nfts.length > 0) {
        const earliestOwnership = Math.min(
          ...user.nfts.map(n => n.ownedSince.getTime())
        );
        holdDays = Math.floor(
          (Date.now() - earliestOwnership) / (1000 * 60 * 60 * 24)
        );
      }

      // Count active club memberships
      const clubsCount = user.chatMemberships.length;

      res.json({
        user: {
          id: user.id,
          telegramId: user.telegramId.toString(),
          username: user.username,
          firstName: user.firstName,
          walletAddress: user.walletAddress,
          totalPoints: user.totalPoints,
          nftCount: user.nftCount
        },
        rank,
        holdDays,
        clubsCount,
        nftsCount: user.nfts.length
      });
    } catch (error) {
      logger.error('Get extended user error:', {
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
 * POST /api/user/check-club/:clubId
 * Check if user is member of a club chat and award bonus points
 * Requires bot to be admin in the chat
 */
router.post('/check-club/:clubId',
  authMiddleware,
  async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;
      const telegramId = req.user!.telegramId;
      const { clubId } = req.params;

      // Check if club exists in config
      if (!CLUB_CONFIGS[clubId]) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Unknown club ID'
        });
        return;
      }

      // Club chat IDs mapping (configured via env)
      const clubChatIds: Record<string, string> = {
        'ice-gang': process.env.ICEGANG_CHAT_ID || '',
        'notcap': process.env.NOTCAP_CHAT_ID || '',
        'sappy-seals': process.env.SAPPYSEALS_CHAT_ID || '',
      };

      const chatId = clubChatIds[clubId];

      // If chat ID not configured, return service unavailable
      if (!chatId) {
        logger.info('Club verification not configured', { clubId });
        res.status(503).json({
          error: 'Service Unavailable',
          message: 'Club verification not configured yet. Ask admin to add bot to the chat.'
        });
        return;
      }

      logger.info('Checking club membership', {
        userId,
        clubId,
        chatId,
        telegramId: telegramId.toString()
      });

      // Check membership via Telegram Bot API
      let isMember = false;
      try {
        const bot = telegramBot.getBot();
        const member = await bot.api.getChatMember(chatId, Number(telegramId));

        // Valid member statuses (not 'left', 'kicked', or 'restricted')
        const validStatuses = ['member', 'administrator', 'creator'];
        isMember = validStatuses.includes(member.status);

        logger.info('Club membership check result', {
          userId,
          clubId,
          status: member.status,
          isMember
        });
      } catch (apiError) {
        // Handle Telegram API errors
        const errorMsg = apiError instanceof Error ? apiError.message : 'Unknown error';

        if (errorMsg.includes('chat not found') || errorMsg.includes('bot was kicked')) {
          logger.warn('Bot not in chat or chat not found', { clubId, chatId });
          res.status(503).json({
            error: 'Service Unavailable',
            message: 'Bot is not added to this chat yet. Contact admin.'
          });
          return;
        }

        if (errorMsg.includes('user not found')) {
          // User not in chat
          isMember = false;
        } else {
          throw apiError;
        }
      }

      // If member, award club boost points
      if (isMember) {
        // Get user's NFT count
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { nftCount: true, totalPoints: true }
        });

        const nftCount = user?.nftCount || 0;
        const boostMeters = calculateClubBoost(clubId, nftCount);
        const clubConfig = CLUB_CONFIGS[clubId];

        // Check if already awarded this club boost
        const existingBoost = await prisma.pointTransaction.findFirst({
          where: {
            userId,
            activityType: 'chat_boost',
            description: {
              contains: clubConfig.name
            }
          }
        });

        if (!existingBoost && boostMeters > 0) {
          // Award club boost points
          await pointsService.awardPoints({
            userId,
            points: boostMeters,
            activityType: 'chat_boost',
            description: `${clubConfig.name} club boost (+${boostMeters}m)`,
            metadata: {
              clubId,
              clubName: clubConfig.name,
              nftCount,
              metersPerSticker: clubConfig.metersPerSticker,
              maxMeters: clubConfig.maxMeters
            }
          });

          // Update leaderboard
          const updatedUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { totalPoints: true }
          });

          if (updatedUser) {
            await leaderboardService.updateUserPosition(userId, updatedUser.totalPoints);
          }

          logger.info('Club boost awarded', {
            userId,
            clubId,
            boostMeters,
            nftCount
          });

          res.json({
            isMember: true,
            boostAwarded: true,
            boostMeters,
            message: `You're in ${clubConfig.name}! +${boostMeters}m bonus activated!`
          });
          return;
        }

        res.json({
          isMember: true,
          boostAwarded: false,
          message: existingBoost
            ? `Already a ${clubConfig.name} member! Boost already active.`
            : `You're in ${clubConfig.name}!`
        });
        return;
      }

      res.json({
        isMember: false,
        message: 'Not a member yet. Join the chat first!'
      });
    } catch (error) {
      logger.error('Club check error:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to check club membership'
      });
    }
  }
);

/**
 * GET /api/user/:telegramId/hold-bonus
 * Get user's hold bonus information
 * Shows hold bonus per NFT, Diamond Hands status, etc.
 * SECURITY: Requires authentication and owner verification
 */
router.get('/:telegramId/hold-bonus',
  authMiddleware,
  validate(schemas.telegramId),
  async (req: AuthRequest, res) => {
    // Verify user is requesting their own data
    if (req.user!.telegramId.toString() !== req.params.telegramId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You can only view your own hold bonus info'
      });
      return;
    }
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

      const holdBonusInfo = await holdBonusService.getUserHoldBonusInfo(user.id);

      res.json({
        holdBonus: {
          totalHoldBonus: holdBonusInfo.totalHoldBonus,
          diamondHands: {
            eligible: holdBonusInfo.diamondHandsEligible,
            awarded: holdBonusInfo.diamondHandsAwarded,
            bonus: 500, // DIAMOND_HANDS_BONUS
            daysUntil: holdBonusInfo.daysUntilDiamondHands
          },
          oldestNftDays: holdBonusInfo.oldestNftDays,
          nfts: holdBonusInfo.nfts.map(nft => ({
            nftId: nft.nftId,
            name: nft.nftName,
            collection: nft.collectionName,
            baseMeters: nft.baseMeters,
            ownedSince: nft.ownedSince, // Actual blockchain ownership date
            detectedAt: nft.detectedAt, // When we first detected it (for reference)
            holdDays: nft.holdInfo.holdDays,
            holdMonths: nft.holdInfo.holdMonths,
            bonusPercent: nft.holdInfo.bonusPercent,
            currentHoldBonus: nft.currentHoldBonus,
            potentialHoldBonus: nft.potentialHoldBonus,
            tierName: nft.holdInfo.tierName,
            daysUntilNextMonth: nft.holdInfo.daysUntilNextMonth
          }))
        }
      });
    } catch (error) {
      logger.error('Get hold bonus error:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get hold bonus info'
      });
    }
  }
);

/**
 * POST /api/user/calculate-hold-bonus
 * DISABLED: Hold bonus will be calculated at end of season
 */
router.post('/calculate-hold-bonus',
  authMiddleware,
  async (req: AuthRequest, res) => {
    // Hold bonus calculation disabled - will be done at end of season
    res.json({
      success: false,
      message: 'Hold bonus will be calculated at end of season',
      result: {
        nftsProcessed: 0,
        holdBonusAwarded: 0,
        diamondHandsAwarded: false,
        diamondHandsBonus: 0,
        totalAwarded: 0
      }
    });
  }
);

export default router;
