import { PrismaClient, User } from '@prisma/client';
import { logger } from '../../utils/logger.js';
import { AchievementService, AchievementUnlock } from './AchievementService.js';

/**
 * Achievement condition definitions
 * Currently only wallet_connected is active
 * Other achievements will be added later
 */
type AchievementCondition = (data: any) => boolean;

const ACHIEVEMENT_CONDITIONS: Record<string, AchievementCondition> = {
  // Wallet achievement
  'wallet_connected': (data: { hasWallet: boolean }) => data.hasWallet === true,

  // Referral achievement - invite first friend
  'referrer_1': (data: { referralCount: number }) => data.referralCount >= 1,

  // NFT achievement - own first NFT
  'first_nft': (data: { nftCount: number }) => data.nftCount >= 1,

  // Points achievements
  'points_100': (data: { totalPoints: number }) => data.totalPoints >= 100,
  'points_1000': (data: { totalPoints: number }) => data.totalPoints >= 1000,

  // Streak achievements
  'streak_7': (data: { streak: number }) => data.streak >= 7,
  'streak_30': (data: { streak: number }) => data.streak >= 30,

  // Leaderboard achievement
  'top_100': (data: { rank: number | null }) => data.rank !== null && data.rank <= 100,
};

export class AchievementChecker {
  constructor(
    private prisma: PrismaClient,
    private achievementService: AchievementService
  ) {}

  /**
   * Check all achievements for user
   */
  async checkUserAchievements(userId: string, rank?: number | null): Promise<AchievementUnlock[]> {
    try {
      const unlocks: AchievementUnlock[] = [];

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          _count: {
            select: {
              referrals: true,
              nfts: true
            }
          }
        }
      });

      if (!user) {
        logger.warn('User not found for achievement check', { userId });
        return unlocks;
      }

      // Build user data for condition checks
      const userData = {
        hasWallet: !!user.walletAddress,
        referralCount: user._count.referrals,
        nftCount: user._count.nfts,
        totalPoints: user.totalPoints,
        streak: user.currentStreak,
        rank: rank ?? null
      };

      // Check all achievements
      for (const [achievementKey, condition] of Object.entries(ACHIEVEMENT_CONDITIONS)) {
        if (condition(userData)) {
          const unlock = await this.achievementService.unlockAchievement(userId, achievementKey);
          if (unlock) {
            unlocks.push(unlock);
          }
        }
      }

      if (unlocks.length > 0) {
        logger.info('Achievements unlocked', {
          userId,
          count: unlocks.length,
          achievements: unlocks.map(u => u.achievementKey)
        });
      }

      return unlocks;
    } catch (error) {
      logger.error('Failed to check user achievements:', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return [];
    }
  }

  /**
   * Check wallet achievement
   */
  async checkWalletAchievement(user: User): Promise<AchievementUnlock[]> {
    const unlocks: AchievementUnlock[] = [];

    const condition = ACHIEVEMENT_CONDITIONS['wallet_connected'];
    if (condition && condition({ hasWallet: !!user.walletAddress })) {
      const unlock = await this.achievementService.unlockAchievement(user.id, 'wallet_connected');
      if (unlock) {
        unlocks.push(unlock);
      }
    }

    return unlocks;
  }

  /**
   * Check specific achievement category
   */
  async checkAchievementCategory(
    userId: string,
    category: 'wallet' | 'streak' | 'nft' | 'points' | 'leaderboard' | 'social' | 'special',
    rank?: number | null
  ): Promise<AchievementUnlock[]> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          _count: {
            select: {
              referrals: true,
              nfts: true
            }
          }
        }
      });

      if (!user) {
        return [];
      }

      const unlocks: AchievementUnlock[] = [];

      // Map categories to achievement keys
      const categoryAchievements: Record<string, string[]> = {
        wallet: ['wallet_connected'],
        social: ['referrer_1'],
        nft: ['first_nft'],
        points: ['points_100', 'points_1000'],
        streak: ['streak_7', 'streak_30'],
        leaderboard: ['top_100'],
        special: ['wallet_connected']
      };

      const achievementsToCheck = categoryAchievements[category] || [];

      // Build user data for condition checks
      const userData = {
        hasWallet: !!user.walletAddress,
        referralCount: user._count.referrals,
        nftCount: user._count.nfts,
        totalPoints: user.totalPoints,
        streak: user.currentStreak,
        rank: rank ?? null
      };

      for (const achievementKey of achievementsToCheck) {
        const condition = ACHIEVEMENT_CONDITIONS[achievementKey];
        if (condition && condition(userData)) {
          const unlock = await this.achievementService.unlockAchievement(userId, achievementKey);
          if (unlock) {
            unlocks.push(unlock);
          }
        }
      }

      return unlocks;
    } catch (error) {
      logger.error('Failed to check achievement category:', {
        userId,
        category,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return [];
    }
  }
}
