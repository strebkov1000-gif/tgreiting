import { PrismaClient, Achievement, UserAchievement } from '@prisma/client';
import { logger } from '../../utils/logger.js';
import { PointsService } from '../points/PointsService.js';

export interface AchievementUnlock {
  achievementId: string;
  achievementKey: string;
  name: string;
  description: string;
  pointsReward: number;
  unlockedAt: Date;
}

export class AchievementService {
  constructor(
    private prisma: PrismaClient,
    private pointsService: PointsService
  ) {}

  /**
   * Get all achievement definitions
   */
  async getAllAchievements(): Promise<Achievement[]> {
    try {
      const achievements = await this.prisma.achievement.findMany({
        orderBy: [
          { category: 'asc' },
          { pointsReward: 'asc' }
        ]
      });

      return achievements;
    } catch (error) {
      logger.error('Failed to get all achievements:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error('Failed to get achievements');
    }
  }

  /**
   * Get user's unlocked achievements
   */
  async getUserAchievements(userId: string): Promise<UserAchievement[]> {
    try {
      const userAchievements = await this.prisma.userAchievement.findMany({
        where: { userId },
        include: {
          achievement: true
        },
        orderBy: {
          unlockedAt: 'desc'
        }
      });

      return userAchievements;
    } catch (error) {
      logger.error('Failed to get user achievements:', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error('Failed to get user achievements');
    }
  }

  /**
   * Unlock achievement for user
   * - Checks if already unlocked
   * - Creates UserAchievement record
   * - Awards points if achievement has reward
   * Returns null if already unlocked
   */
  async unlockAchievement(userId: string, achievementKey: string): Promise<AchievementUnlock | null> {
    try {
      // Check if already unlocked
      const hasAchievement = await this.hasAchievement(userId, achievementKey);
      if (hasAchievement) {
        logger.debug('Achievement already unlocked', { userId, achievementKey });
        return null;
      }

      // Get achievement definition
      const achievement = await this.prisma.achievement.findUnique({
        where: { key: achievementKey }
      });

      if (!achievement) {
        logger.warn('Achievement not found', { achievementKey });
        return null;
      }

      // Create UserAchievement record
      const userAchievement = await this.prisma.userAchievement.create({
        data: {
          userId,
          achievementId: achievement.id,
          notified: false
        }
      });

      // Award points if achievement has reward
      if (achievement.pointsReward > 0) {
        await this.pointsService.awardPoints({
          userId,
          points: achievement.pointsReward,
          activityType: 'achievement',
          description: `Achievement unlocked: ${achievement.name}`,
          metadata: {
            achievementKey: achievement.key,
            achievementName: achievement.name
          }
        });
      }

      logger.info('Achievement unlocked', {
        userId,
        achievementKey,
        achievementName: achievement.name,
        pointsAwarded: achievement.pointsReward
      });

      return {
        achievementId: achievement.id,
        achievementKey: achievement.key,
        name: achievement.name,
        description: achievement.description,
        pointsReward: achievement.pointsReward,
        unlockedAt: userAchievement.unlockedAt
      };
    } catch (error) {
      logger.error('Failed to unlock achievement:', {
        userId,
        achievementKey,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error('Failed to unlock achievement');
    }
  }

  /**
   * Check if user already has achievement
   */
  async hasAchievement(userId: string, achievementKey: string): Promise<boolean> {
    try {
      const achievement = await this.prisma.achievement.findUnique({
        where: { key: achievementKey }
      });

      if (!achievement) {
        return false;
      }

      const userAchievement = await this.prisma.userAchievement.findUnique({
        where: {
          userId_achievementId: {
            userId,
            achievementId: achievement.id
          }
        }
      });

      return userAchievement !== null;
    } catch (error) {
      logger.error('Failed to check if user has achievement:', {
        userId,
        achievementKey,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Get achievement by key
   */
  async getAchievementByKey(achievementKey: string): Promise<Achievement | null> {
    try {
      const achievement = await this.prisma.achievement.findUnique({
        where: { key: achievementKey }
      });

      return achievement;
    } catch (error) {
      logger.error('Failed to get achievement by key:', {
        achievementKey,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  /**
   * Get user's achievement statistics
   */
  async getUserAchievementStats(userId: string): Promise<{
    totalUnlocked: number;
    totalAvailable: number;
    percentage: number;
    recentUnlocks: UserAchievement[];
  }> {
    try {
      const [userAchievements, allAchievements] = await Promise.all([
        this.getUserAchievements(userId),
        this.getAllAchievements()
      ]);

      const totalUnlocked = userAchievements.length;
      const totalAvailable = allAchievements.length;
      const percentage = totalAvailable > 0
        ? Math.round((totalUnlocked / totalAvailable) * 100)
        : 0;

      // Get recent unlocks (last 5)
      const recentUnlocks = userAchievements.slice(0, 5);

      return {
        totalUnlocked,
        totalAvailable,
        percentage,
        recentUnlocks
      };
    } catch (error) {
      logger.error('Failed to get user achievement stats:', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error('Failed to get achievement stats');
    }
  }

  /**
   * Mark achievement notification as sent
   */
  async markAsNotified(userId: string, achievementKey: string): Promise<void> {
    try {
      const achievement = await this.prisma.achievement.findUnique({
        where: { key: achievementKey }
      });

      if (!achievement) {
        logger.warn('Achievement not found', { achievementKey });
        return;
      }

      await this.prisma.userAchievement.update({
        where: {
          userId_achievementId: {
            userId,
            achievementId: achievement.id
          }
        },
        data: {
          notified: true
        }
      });

      logger.debug('Achievement notification marked', { userId, achievementKey });
    } catch (error) {
      logger.error('Failed to mark achievement as notified:', {
        userId,
        achievementKey,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      // Don't throw - not critical
    }
  }

  /**
   * Get achievements by category
   */
  async getAchievementsByCategory(category: string): Promise<Achievement[]> {
    try {
      const achievements = await this.prisma.achievement.findMany({
        where: { category },
        orderBy: { pointsReward: 'asc' }
      });

      return achievements;
    } catch (error) {
      logger.error('Failed to get achievements by category:', {
        category,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error('Failed to get achievements by category');
    }
  }
}
