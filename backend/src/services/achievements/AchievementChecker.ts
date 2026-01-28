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
  // Only wallet achievement is active for now
  'wallet_connected': (data: { hasWallet: boolean }) => data.hasWallet === true,

  // TODO: Add conditions for other achievements later
  // 'points_100': (data) => data.totalPoints >= 100,
  // 'streak_7': (data) => data.streak >= 7,
  // 'referrer_1': (data) => data.referralCount >= 1,
  // 'first_nft': (data) => data.nftCount >= 1,
  // 'top_100': (data) => data.rank !== null && data.rank <= 100,
  // 'points_1000': (data) => data.totalPoints >= 1000,
  // 'streak_30': (data) => data.streak >= 30,
};

export class AchievementChecker {
  constructor(
    private prisma: PrismaClient,
    private achievementService: AchievementService
  ) {}

  /**
   * Check all achievements for user
   * Currently only checks wallet achievement
   */
  async checkUserAchievements(userId: string, rank?: number | null): Promise<AchievementUnlock[]> {
    try {
      const unlocks: AchievementUnlock[] = [];

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        logger.warn('User not found for achievement check', { userId });
        return unlocks;
      }

      // Only check wallet achievement for now
      const walletUnlocks = await this.checkWalletAchievement(user);
      unlocks.push(...walletUnlocks);

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
   * Currently only 'wallet' category is active
   */
  async checkAchievementCategory(
    userId: string,
    category: 'wallet' | 'streak' | 'nft' | 'points' | 'leaderboard' | 'social' | 'special',
    rank?: number | null
  ): Promise<AchievementUnlock[]> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return [];
      }

      // Only wallet category is active for now
      if (category === 'wallet') {
        return await this.checkWalletAchievement(user);
      }

      // Other categories disabled for now
      return [];
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
