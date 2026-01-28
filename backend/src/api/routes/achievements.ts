import { Router } from 'express';
import { validate, schemas } from '../middleware/validation.js';
import { AuthRequest } from '../middleware/auth.js';
import { logger } from '../../utils/logger.js';
import { prisma } from '../../database/prisma/client.js';
import { AchievementService } from '../../services/achievements/AchievementService.js';
import { PointsService } from '../../services/points/PointsService.js';

const router = Router();

// Initialize services
const pointsService = new PointsService(prisma);
const achievementService = new AchievementService(prisma, pointsService);

/**
 * GET /api/achievements
 * Get all achievement definitions
 */
router.get('/',
  async (req: AuthRequest, res) => {
    try {
      const achievements = await achievementService.getAllAchievements();

      res.json({
        achievements: achievements.map(a => ({
          id: a.id,
          key: a.key,
          name: a.name,
          description: a.description,
          icon: a.icon,
          pointsReward: a.pointsReward,
          category: a.category
        })),
        total: achievements.length
      });
    } catch (error) {
      logger.error('Get achievements error:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get achievements'
      });
    }
  }
);

/**
 * GET /api/achievements/:telegramId
 * Get user's unlocked achievements
 */
router.get('/:telegramId',
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

      // Get user's unlocked achievements
      const userAchievements = await achievementService.getUserAchievements(user.id);

      // Get all achievements
      const allAchievements = await achievementService.getAllAchievements();

      // Map achievements with unlock status
      const achievementsWithStatus = allAchievements.map(achievement => {
        const unlocked = userAchievements.find(
          ua => ua.achievementId === achievement.id
        );

        return {
          id: achievement.id,
          key: achievement.key,
          name: achievement.name,
          description: achievement.description,
          icon: achievement.icon,
          pointsReward: achievement.pointsReward,
          category: achievement.category,
          unlocked: !!unlocked,
          unlockedAt: unlocked?.unlockedAt
        };
      });

      // Get achievement stats
      const stats = await achievementService.getUserAchievementStats(user.id);

      res.json({
        achievements: achievementsWithStatus,
        stats: {
          unlockedCount: stats.totalUnlocked,
          totalCount: stats.totalAvailable,
          percentage: stats.percentage
        },
        recentUnlocks: stats.recentUnlocks.map(ua => {
          const achievement = (ua as any).achievement;
          return {
            achievementId: ua.achievementId,
            unlockedAt: ua.unlockedAt,
            achievement: achievement ? {
              key: achievement.key,
              name: achievement.name,
              description: achievement.description,
              icon: achievement.icon,
              pointsReward: achievement.pointsReward
            } : undefined
          };
        })
      });
    } catch (error) {
      logger.error('Get user achievements error:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get user achievements'
      });
    }
  }
);

/**
 * GET /api/achievements/category/:category
 * Get achievements by category
 */
router.get('/category/:category',
  async (req: AuthRequest, res) => {
    try {
      const { category } = req.params;

      const achievements = await achievementService.getAchievementsByCategory(category);

      res.json({
        achievements: achievements.map(a => ({
          id: a.id,
          key: a.key,
          name: a.name,
          description: a.description,
          icon: a.icon,
          pointsReward: a.pointsReward,
          category: a.category
        })),
        category,
        count: achievements.length
      });
    } catch (error) {
      logger.error('Get achievements by category error:', {
        category: req.params.category,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get achievements by category'
      });
    }
  }
);

export default router;
