import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { nftScanLimiter } from '../middleware/rateLimit.js';
import { validate, schemas } from '../middleware/validation.js';
import { logger } from '../../utils/logger.js';
import { prisma } from '../../database/prisma/client.js';
import { redis } from '../../database/redis/client.js';
import { NftScannerService } from '../../services/ton/NftScannerService.js';
import { PointsService } from '../../services/points/PointsService.js';
import { LeaderboardService } from '../../services/leaderboard/LeaderboardService.js';
import { AchievementChecker } from '../../services/achievements/AchievementChecker.js';
import { AchievementService } from '../../services/achievements/AchievementService.js';
import { ReferralRewardService } from '../../services/referral/ReferralRewardService.js';
import { HoldBonusService } from '../../services/holdbonus/HoldBonusService.js';

const router = Router();

// Initialize services
const pointsService = new PointsService(prisma);
const nftScannerService = new NftScannerService(prisma, pointsService);
const leaderboardService = new LeaderboardService(prisma, redis);
const achievementService = new AchievementService(prisma, pointsService);
const achievementChecker = new AchievementChecker(prisma, achievementService);
const referralRewardService = new ReferralRewardService(prisma);
const holdBonusService = new HoldBonusService(prisma, pointsService);

/**
 * POST /api/nft/scan/:telegramId
 * Trigger NFT scan for user's wallet
 * Rate limited: 10 scans per hour
 */
router.post('/scan/:telegramId',
  authMiddleware,
  nftScanLimiter,
  validate(schemas.telegramId),
  async (req: AuthRequest, res) => {
    try {
      const { telegramId } = req.params;

      // Verify user owns this account
      if (req.user!.telegramId.toString() !== telegramId) {
        res.status(403).json({
          error: 'Forbidden',
          message: 'You can only scan your own wallet'
        });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { telegramId: BigInt(telegramId) },
        select: { id: true, walletAddress: true }
      });

      if (!user) {
        res.status(404).json({
          error: 'Not Found',
          message: 'User not found'
        });
        return;
      }

      if (!user.walletAddress) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'No wallet connected. Please connect your TON wallet first.'
        });
        return;
      }

      // Perform NFT scan
      const result = await nftScannerService.updateUserNfts(user.id, user.walletAddress);

      // DISABLED: Hold bonus will be calculated at end of season
      // let holdBonusResult = null;
      // try {
      //   holdBonusResult = await holdBonusService.calculateAndAwardHoldBonus(user.id);
      //   if (holdBonusResult.totalAwarded > 0) {
      //     logger.info('Hold bonus awarded during scan', {
      //       userId: user.id,
      //       holdBonusAwarded: holdBonusResult.holdBonusAwarded,
      //       diamondHandsAwarded: holdBonusResult.diamondHandsAwarded
      //     });
      //   }
      // } catch (holdError) {
      //   logger.error('Hold bonus calculation failed during scan', {
      //     userId: user.id,
      //     error: holdError instanceof Error ? holdError.message : 'Unknown error'
      //   });
      // }

      // Update leaderboard if points were awarded
      const totalPointsAwarded = result.pointsAwarded;
      if (totalPointsAwarded > 0) {
        const updatedUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { totalPoints: true }
        });

        if (updatedUser) {
          await leaderboardService.updateUserPosition(user.id, updatedUser.totalPoints);

          // Check if user reached level 2 and trigger referral rewards
          await referralRewardService.checkAndAwardReferralRewards(user.id, leaderboardService);
        }
      }

      // Get rank
      const rank = await leaderboardService.getUserRank(user.id);

      // Check for NFT-related achievements
      const achievementUnlocks = await achievementChecker.checkAchievementCategory(
        user.id,
        'nft',
        rank
      );

      res.json({
        success: true,
        result: {
          nftsFound: result.nftsFound,
          nftsAdded: result.nftsAdded,
          nftsRemoved: result.nftsRemoved,
          pointsAwarded: result.pointsAwarded,
          // holdBonus disabled - will be calculated at end of season
          holdBonus: null
        },
        rank,
        achievements: achievementUnlocks.length > 0 ? achievementUnlocks : undefined
      });
    } catch (error) {
      logger.error('NFT scan error:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to scan NFTs'
      });
    }
  }
);

/**
 * GET /api/nft/collections
 * Get all tracked NFT collections
 * NOTE: This route MUST be before /:telegramId to avoid conflict
 */
router.get('/collections',
  async (req: AuthRequest, res) => {
    try {
      const collections = await prisma.nFTCollection.findMany({
        select: {
          id: true,
          address: true,
          name: true,
          description: true,
          packTier: true,
          pointsMultiplier: true,
          basePoints: true,
          _count: {
            select: {
              nfts: true
            }
          }
        },
        orderBy: {
          pointsMultiplier: 'desc'
        }
      });

      res.json({
        collections: collections.map(col => ({
          id: col.id,
          address: col.address,
          name: col.name,
          description: col.description,
          tier: col.packTier,
          multiplier: col.pointsMultiplier,
          basePoints: col.basePoints,
          itemsCount: col._count.nfts
        })),
        total: collections.length
      });
    } catch (error) {
      logger.error('Get collections error:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get NFT collections'
      });
    }
  }
);

/**
 * GET /api/nft/:telegramId
 * Get user's NFT collection
 * SECURITY: Requires authentication and owner verification
 */
router.get('/:telegramId',
  authMiddleware,
  validate(schemas.telegramId),
  async (req: AuthRequest, res) => {
    // Verify user is requesting their own data
    if (req.user!.telegramId.toString() !== req.params.telegramId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You can only view your own NFT collection'
      });
      return;
    }
    try {
      const { telegramId } = req.params;

      const user = await prisma.user.findUnique({
        where: { telegramId: BigInt(telegramId) },
        include: {
          nfts: {
            include: {
              nft: {
                include: {
                  collection: true
                }
              }
            },
            orderBy: {
              detectedAt: 'desc'
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

      // Calculate hold days for each NFT using ownedSince (actual blockchain ownership date)
      const now = new Date();

      res.json({
        nfts: user.nfts.map(userNft => {
          // Use ownedSince (blockchain date) for hold bonus calculation
          const holdDays = Math.floor((now.getTime() - userNft.ownedSince.getTime()) / (1000 * 60 * 60 * 24));
          const holdMonths = Math.floor(holdDays / 30);

          return {
            id: userNft.nft.id,
            itemIndex: userNft.nft.itemIndex,
            name: userNft.nft.name,
            imageUrl: userNft.nft.imageUrl,
            metadata: userNft.nft.metadata,
            collection: {
              id: userNft.nft.collection.id,
              name: userNft.nft.collection.name,
              address: userNft.nft.collection.address,
              description: userNft.nft.collection.description,
              tier: userNft.nft.collection.packTier,
              multiplier: userNft.nft.collection.pointsMultiplier,
              basePoints: userNft.nft.collection.basePoints
            },
            ownedSince: userNft.ownedSince, // Actual blockchain ownership date
            detectedAt: userNft.detectedAt, // When we first detected it
            pointsAwarded: userNft.pointsAwarded,
            // Hold bonus info (based on blockchain ownership)
            holdDays,
            holdMonths,
            holdBonusPercent: holdMonths * 10,
            totalHoldBonus: userNft.totalHoldBonus
          };
        }),
        totalNfts: user.nfts.length,
        walletAddress: user.walletAddress
      });
    } catch (error) {
      logger.error('Get NFTs error:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get NFTs'
      });
    }
  }
);

export default router;
