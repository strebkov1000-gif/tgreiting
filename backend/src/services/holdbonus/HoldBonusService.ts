import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger.js';
import { PointsService } from '../points/PointsService.js';
import {
  calculateHoldDays,
  calculateHoldMonths,
  getHoldMultiplier,
  getHoldBonusPercent,
  isDiamondHands,
  DIAMOND_HANDS_BONUS,
  DIAMOND_HANDS_DAYS,
  getHoldBonusInfo,
  HoldBonusInfo
} from '../../utils/holdBonus.js';

export interface HoldBonusResult {
  userId: string;
  nftsProcessed: number;
  holdBonusAwarded: number;
  diamondHandsAwarded: boolean;
  diamondHandsBonus: number;
  totalAwarded: number;
}

export interface UserHoldBonusInfo {
  totalHoldBonus: number;
  diamondHandsEligible: boolean;
  diamondHandsAwarded: boolean;
  nfts: Array<{
    nftId: string;
    nftName: string;
    collectionName: string;
    baseMeters: number;
    ownedSince: Date; // When NFT was actually acquired on blockchain
    detectedAt: Date; // When we first detected it in our system (for reference)
    holdInfo: HoldBonusInfo;
    currentHoldBonus: number;
    potentialHoldBonus: number;
  }>;
  oldestNftDays: number;
  daysUntilDiamondHands: number | null;
}

export class HoldBonusService {
  constructor(
    private prisma: PrismaClient,
    private pointsService: PointsService
  ) {}

  /**
   * Calculate and award hold bonus for a single user
   * This should be called periodically (e.g., daily) to update hold bonuses
   *
   * Logic:
   * - For each NFT, check how many months user has held it
   * - If months increased since last check, award the difference in bonus
   * - Example: NFT with 100 base meters
   *   - Month 1: +10% = 10 bonus meters
   *   - Month 2: +20% total, but already got 10, so award 10 more
   *   - etc.
   */
  async calculateAndAwardHoldBonus(userId: string): Promise<HoldBonusResult> {
    const result: HoldBonusResult = {
      userId,
      nftsProcessed: 0,
      holdBonusAwarded: 0,
      diamondHandsAwarded: false,
      diamondHandsBonus: 0,
      totalAwarded: 0
    };

    try {
      // Get user with their NFTs
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          nfts: {
            include: {
              nft: {
                include: {
                  collection: true
                }
              }
            }
          }
        }
      });

      if (!user) {
        logger.warn('User not found for hold bonus calculation', { userId });
        return result;
      }

      // Process each NFT
      for (const userNft of user.nfts) {
        result.nftsProcessed++;

        // Use ownedSince (actual blockchain ownership date) for hold bonus calculation
        const holdDays = calculateHoldDays(userNft.ownedSince);
        const currentMonths = calculateHoldMonths(holdDays);
        const previousMonths = userNft.lastHoldBonusMonths;

        // Check if we need to award new hold bonus
        if (currentMonths > previousMonths) {
          // Calculate bonus meters to award
          // Base meters for this NFT
          const baseMeters = userNft.nft.collection.basePoints;

          // Calculate total hold bonus percentage for current months vs previous
          const currentBonusPercent = currentMonths * 10; // 10% per month
          const previousBonusPercent = previousMonths * 10;

          // Bonus meters to award = base * (currentPercent - previousPercent) / 100
          const bonusMetersToAward = Math.floor(
            baseMeters * (currentBonusPercent - previousBonusPercent) / 100
          );

          if (bonusMetersToAward > 0) {
            // Award the hold bonus
            await this.pointsService.awardPoints({
              userId,
              points: bonusMetersToAward,
              activityType: 'hold_bonus',
              description: `Hold bonus: ${userNft.nft.name || 'NFT'} (${currentMonths} months, +${currentBonusPercent - previousBonusPercent}%)`,
              metadata: {
                nftId: userNft.nftId,
                nftName: userNft.nft.name,
                collectionName: userNft.nft.collection.name,
                baseMeters,
                holdDays,
                holdMonths: currentMonths,
                previousMonths,
                bonusPercent: currentBonusPercent - previousBonusPercent,
                totalBonusPercent: currentBonusPercent
              }
            });

            result.holdBonusAwarded += bonusMetersToAward;

            logger.info('Hold bonus awarded', {
              userId,
              nftId: userNft.nftId,
              nftName: userNft.nft.name,
              holdMonths: currentMonths,
              bonusMeters: bonusMetersToAward
            });
          }

          // Update UserNFT with new hold bonus info
          await this.prisma.userNFT.update({
            where: { id: userNft.id },
            data: {
              lastHoldBonusAt: new Date(),
              lastHoldBonusMonths: currentMonths,
              totalHoldBonus: {
                increment: bonusMetersToAward
              }
            }
          });
        }
      }

      // Check for Diamond Hands bonus (6+ months holding at least one NFT)
      // Uses ownedSince (actual blockchain ownership date)
      if (!user.diamondHandsAwarded && user.nfts.length > 0) {
        const oldestNft = user.nfts.reduce((oldest, current) =>
          current.ownedSince < oldest.ownedSince ? current : oldest
        );

        const oldestHoldDays = calculateHoldDays(oldestNft.ownedSince);

        if (isDiamondHands(oldestHoldDays)) {
          // Award Diamond Hands bonus
          await this.pointsService.awardPoints({
            userId,
            points: DIAMOND_HANDS_BONUS,
            activityType: 'hold_bonus',
            description: `Diamond Hands bonus: Held NFT for 6+ months (+${DIAMOND_HANDS_BONUS}m)`,
            metadata: {
              type: 'diamond_hands',
              oldestNftId: oldestNft.nftId,
              oldestNftName: oldestNft.nft.name,
              holdDays: oldestHoldDays
            }
          });

          // Mark Diamond Hands as awarded
          await this.prisma.user.update({
            where: { id: userId },
            data: {
              diamondHandsAwarded: true,
              diamondHandsAwardedAt: new Date()
            }
          });

          result.diamondHandsAwarded = true;
          result.diamondHandsBonus = DIAMOND_HANDS_BONUS;

          logger.info('Diamond Hands bonus awarded', {
            userId,
            oldestNftName: oldestNft.nft.name,
            holdDays: oldestHoldDays
          });
        }
      }

      result.totalAwarded = result.holdBonusAwarded + result.diamondHandsBonus;

      return result;
    } catch (error) {
      logger.error('Failed to calculate hold bonus', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Calculate and award hold bonus for ALL users
   * Used by the daily job
   */
  async calculateAndAwardHoldBonusForAll(): Promise<{
    usersProcessed: number;
    totalHoldBonus: number;
    totalDiamondHands: number;
    errors: number;
  }> {
    const stats = {
      usersProcessed: 0,
      totalHoldBonus: 0,
      totalDiamondHands: 0,
      errors: 0
    };

    try {
      // Get all users with NFTs
      const users = await this.prisma.user.findMany({
        where: {
          nfts: {
            some: {} // Has at least one NFT
          }
        },
        select: {
          id: true,
          telegramId: true
        }
      });

      logger.info(`Starting hold bonus calculation for ${users.length} users`);

      for (const user of users) {
        try {
          const result = await this.calculateAndAwardHoldBonus(user.id);

          stats.usersProcessed++;
          stats.totalHoldBonus += result.holdBonusAwarded;
          if (result.diamondHandsAwarded) {
            stats.totalDiamondHands++;
          }

          // Small delay to avoid overwhelming the database
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          stats.errors++;
          logger.error('Hold bonus calculation failed for user', {
            userId: user.id,
            telegramId: user.telegramId.toString(),
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      logger.info('Hold bonus calculation completed', stats);

      return stats;
    } catch (error) {
      logger.error('Failed to calculate hold bonus for all users', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get hold bonus info for a user (for API/UI)
   */
  async getUserHoldBonusInfo(userId: string): Promise<UserHoldBonusInfo> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        nfts: {
          include: {
            nft: {
              include: {
                collection: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    const nftsInfo = user.nfts.map(userNft => {
      // Use ownedSince (actual blockchain ownership date) for hold bonus calculation
      const holdInfo = getHoldBonusInfo(userNft.ownedSince);
      const baseMeters = userNft.nft.collection.basePoints;

      // Current hold bonus for this NFT
      const currentHoldBonus = userNft.totalHoldBonus;

      // Potential total hold bonus at current month
      const potentialHoldBonus = Math.floor(baseMeters * holdInfo.bonusPercent / 100);

      return {
        nftId: userNft.nftId,
        nftName: userNft.nft.name || 'Unknown NFT',
        collectionName: userNft.nft.collection.name,
        baseMeters,
        ownedSince: userNft.ownedSince, // Actual blockchain ownership date
        detectedAt: userNft.detectedAt, // When we first detected it (for reference)
        holdInfo,
        currentHoldBonus,
        potentialHoldBonus
      };
    });

    // Calculate total hold bonus
    const totalHoldBonus = nftsInfo.reduce((sum, nft) => sum + nft.currentHoldBonus, 0);

    // Find oldest NFT for Diamond Hands calculation
    // Uses ownedSince (actual blockchain ownership date)
    let oldestNftDays = 0;
    if (user.nfts.length > 0) {
      const oldestNft = user.nfts.reduce((oldest, current) =>
        current.ownedSince < oldest.ownedSince ? current : oldest
      );
      oldestNftDays = calculateHoldDays(oldestNft.ownedSince);
    }

    const daysUntilDiamondHands = user.diamondHandsAwarded
      ? null
      : Math.max(0, DIAMOND_HANDS_DAYS - oldestNftDays);

    return {
      totalHoldBonus,
      diamondHandsEligible: oldestNftDays >= DIAMOND_HANDS_DAYS,
      diamondHandsAwarded: user.diamondHandsAwarded,
      nfts: nftsInfo,
      oldestNftDays,
      daysUntilDiamondHands
    };
  }

  /**
   * Recalculate hold bonus from scratch for a user
   * Useful for fixing discrepancies or after manual adjustments
   */
  async recalculateHoldBonusFromScratch(userId: string): Promise<HoldBonusResult> {
    // Reset all hold bonus tracking for user's NFTs
    await this.prisma.userNFT.updateMany({
      where: { userId },
      data: {
        lastHoldBonusMonths: 0,
        totalHoldBonus: 0,
        lastHoldBonusAt: null
      }
    });

    // Reset Diamond Hands if needed (optional, comment out if you want to keep it)
    // await this.prisma.user.update({
    //   where: { id: userId },
    //   data: {
    //     diamondHandsAwarded: false,
    //     diamondHandsAwardedAt: null
    //   }
    // });

    // Now calculate fresh
    return this.calculateAndAwardHoldBonus(userId);
  }
}
