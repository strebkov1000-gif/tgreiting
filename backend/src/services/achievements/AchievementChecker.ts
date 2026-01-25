import { PrismaClient, User } from '@prisma/client';
import { logger } from '../../utils/logger.js';
import { AchievementService, AchievementUnlock } from './AchievementService.js';

/**
 * Achievement condition definitions
 * Each achievement has a unique key and condition function
 */
type AchievementCondition = (data: any) => boolean;

const ACHIEVEMENT_CONDITIONS: Record<string, AchievementCondition> = {
  // Streak achievements
  'streak_7': (data: { streak: number }) => data.streak >= 7,
  'streak_30': (data: { streak: number }) => data.streak >= 30,
  'streak_100': (data: { streak: number }) => data.streak >= 100,
  'streak_365': (data: { streak: number }) => data.streak >= 365,

  // NFT achievements
  'first_nft': (data: { nftCount: number }) => data.nftCount >= 1,
  'collector_5': (data: { nftCount: number }) => data.nftCount >= 5,
  'collector_10': (data: { nftCount: number }) => data.nftCount >= 10,
  'collector_25': (data: { nftCount: number }) => data.nftCount >= 25,
  'whale_50': (data: { nftCount: number }) => data.nftCount >= 50,
  'whale_100': (data: { nftCount: number }) => data.nftCount >= 100,

  // Points achievements
  'points_100': (data: { totalPoints: number }) => data.totalPoints >= 100,
  'points_500': (data: { totalPoints: number }) => data.totalPoints >= 500,
  'points_1000': (data: { totalPoints: number }) => data.totalPoints >= 1000,
  'points_5000': (data: { totalPoints: number }) => data.totalPoints >= 5000,
  'points_10000': (data: { totalPoints: number }) => data.totalPoints >= 10000,
  'points_50000': (data: { totalPoints: number }) => data.totalPoints >= 50000,
  'points_100000': (data: { totalPoints: number }) => data.totalPoints >= 100000,

  // Leaderboard achievements
  'top_1000': (data: { rank: number }) => data.rank !== null && data.rank <= 1000,
  'top_500': (data: { rank: number }) => data.rank !== null && data.rank <= 500,
  'top_100': (data: { rank: number }) => data.rank !== null && data.rank <= 100,
  'top_50': (data: { rank: number }) => data.rank !== null && data.rank <= 50,
  'top_10': (data: { rank: number }) => data.rank !== null && data.rank <= 10,
  'top_3': (data: { rank: number }) => data.rank !== null && data.rank <= 3,
  'champion': (data: { rank: number }) => data.rank === 1,

  // Social achievements (referrals)
  'referrer_1': (data: { referralCount: number }) => data.referralCount >= 1,
  'referrer_5': (data: { referralCount: number }) => data.referralCount >= 5,
  'referrer_10': (data: { referralCount: number }) => data.referralCount >= 10,
  'referrer_25': (data: { referralCount: number }) => data.referralCount >= 25,
  'referrer_50': (data: { referralCount: number }) => data.referralCount >= 50,
  'influencer_100': (data: { referralCount: number }) => data.referralCount >= 100,

  // Special achievements
  'early_adopter': (data: { joinedAt: Date }) => {
    // Users who joined in the first week (customize date)
    const launchDate = new Date('2024-01-01');
    const oneWeekAfter = new Date(launchDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    return data.joinedAt <= oneWeekAfter;
  },

  'premium_member': (data: { isPremium: boolean }) => data.isPremium === true,
};

export class AchievementChecker {
  constructor(
    private prisma: PrismaClient,
    private achievementService: AchievementService
  ) {}

  /**
   * Check all achievements for user
   * Called after major actions (check-in, NFT scan, points change)
   */
  async checkUserAchievements(userId: string, rank?: number | null): Promise<AchievementUnlock[]> {
    try {
      const unlocks: AchievementUnlock[] = [];

      // Get user data
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          _count: {
            select: {
              referrals: true
            }
          }
        }
      });

      if (!user) {
        logger.warn('User not found for achievement check', { userId });
        return unlocks;
      }

      // Check all achievement types
      const [streakUnlocks, nftUnlocks, pointsUnlocks, leaderboardUnlocks, socialUnlocks, specialUnlocks] = await Promise.all([
        this.checkStreakAchievements(user),
        this.checkNftAchievements(user),
        this.checkPointsAchievements(user),
        this.checkLeaderboardAchievements(user, rank),
        this.checkSocialAchievements(user, user._count.referrals),
        this.checkSpecialAchievements(user)
      ]);

      // Combine all unlocks
      unlocks.push(
        ...streakUnlocks,
        ...nftUnlocks,
        ...pointsUnlocks,
        ...leaderboardUnlocks,
        ...socialUnlocks,
        ...specialUnlocks
      );

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
   * Check streak-based achievements
   */
  async checkStreakAchievements(user: User): Promise<AchievementUnlock[]> {
    const unlocks: AchievementUnlock[] = [];
    const streakKeys = ['streak_7', 'streak_30', 'streak_100', 'streak_365'];

    for (const key of streakKeys) {
      const condition = ACHIEVEMENT_CONDITIONS[key];
      if (condition && condition({ streak: user.currentStreak })) {
        const unlock = await this.achievementService.unlockAchievement(user.id, key);
        if (unlock) {
          unlocks.push(unlock);
        }
      }
    }

    return unlocks;
  }

  /**
   * Check NFT-based achievements
   */
  async checkNftAchievements(user: User): Promise<AchievementUnlock[]> {
    const unlocks: AchievementUnlock[] = [];
    const nftKeys = ['first_nft', 'collector_5', 'collector_10', 'collector_25', 'whale_50', 'whale_100'];

    for (const key of nftKeys) {
      const condition = ACHIEVEMENT_CONDITIONS[key];
      if (condition && condition({ nftCount: user.nftCount })) {
        const unlock = await this.achievementService.unlockAchievement(user.id, key);
        if (unlock) {
          unlocks.push(unlock);
        }
      }
    }

    return unlocks;
  }

  /**
   * Check points-based achievements
   */
  async checkPointsAchievements(user: User): Promise<AchievementUnlock[]> {
    const unlocks: AchievementUnlock[] = [];
    const pointsKeys = [
      'points_100',
      'points_500',
      'points_1000',
      'points_5000',
      'points_10000',
      'points_50000',
      'points_100000'
    ];

    for (const key of pointsKeys) {
      const condition = ACHIEVEMENT_CONDITIONS[key];
      if (condition && condition({ totalPoints: user.totalPoints })) {
        const unlock = await this.achievementService.unlockAchievement(user.id, key);
        if (unlock) {
          unlocks.push(unlock);
        }
      }
    }

    return unlocks;
  }

  /**
   * Check leaderboard-based achievements
   */
  async checkLeaderboardAchievements(user: User, rank?: number | null): Promise<AchievementUnlock[]> {
    const unlocks: AchievementUnlock[] = [];

    if (rank === undefined || rank === null) {
      return unlocks; // No rank provided
    }

    const leaderboardKeys = ['top_1000', 'top_500', 'top_100', 'top_50', 'top_10', 'top_3', 'champion'];

    for (const key of leaderboardKeys) {
      const condition = ACHIEVEMENT_CONDITIONS[key];
      if (condition && condition({ rank })) {
        const unlock = await this.achievementService.unlockAchievement(user.id, key);
        if (unlock) {
          unlocks.push(unlock);
        }
      }
    }

    return unlocks;
  }

  /**
   * Check social achievements (referrals)
   */
  async checkSocialAchievements(user: User, referralCount: number): Promise<AchievementUnlock[]> {
    const unlocks: AchievementUnlock[] = [];
    const socialKeys = ['referrer_1', 'referrer_5', 'referrer_10', 'referrer_25', 'referrer_50', 'influencer_100'];

    for (const key of socialKeys) {
      const condition = ACHIEVEMENT_CONDITIONS[key];
      if (condition && condition({ referralCount })) {
        const unlock = await this.achievementService.unlockAchievement(user.id, key);
        if (unlock) {
          unlocks.push(unlock);
        }
      }
    }

    return unlocks;
  }

  /**
   * Check special achievements
   */
  async checkSpecialAchievements(user: User): Promise<AchievementUnlock[]> {
    const unlocks: AchievementUnlock[] = [];
    const specialKeys = ['early_adopter', 'premium_member'];

    for (const key of specialKeys) {
      const condition = ACHIEVEMENT_CONDITIONS[key];
      if (!condition) continue;

      let shouldUnlock = false;

      if (key === 'early_adopter') {
        shouldUnlock = condition({ joinedAt: user.joinedAt });
      } else if (key === 'premium_member') {
        shouldUnlock = condition({ isPremium: user.isPremium });
      }

      if (shouldUnlock) {
        const unlock = await this.achievementService.unlockAchievement(user.id, key);
        if (unlock) {
          unlocks.push(unlock);
        }
      }
    }

    return unlocks;
  }

  /**
   * Check specific achievement category
   */
  async checkAchievementCategory(
    userId: string,
    category: 'streak' | 'nft' | 'points' | 'leaderboard' | 'social' | 'special',
    rank?: number | null
  ): Promise<AchievementUnlock[]> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          _count: {
            select: {
              referrals: true
            }
          }
        }
      });

      if (!user) {
        return [];
      }

      switch (category) {
        case 'streak':
          return await this.checkStreakAchievements(user);
        case 'nft':
          return await this.checkNftAchievements(user);
        case 'points':
          return await this.checkPointsAchievements(user);
        case 'leaderboard':
          return await this.checkLeaderboardAchievements(user, rank);
        case 'social':
          return await this.checkSocialAchievements(user, user._count.referrals);
        case 'special':
          return await this.checkSpecialAchievements(user);
        default:
          return [];
      }
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
