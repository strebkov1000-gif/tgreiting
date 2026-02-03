import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { logger } from '../../utils/logger.js';
import { prisma } from '../../database/prisma/client.js';
import { telegramBot } from '../../bot/index.js';
import { LeaderboardService } from '../../services/leaderboard/LeaderboardService.js';
import { ReferralRewardService } from '../../services/referral/ReferralRewardService.js';
import { redis } from '../../database/redis/client.js';
import rateLimit from 'express-rate-limit';

const router = Router();

const leaderboardService = new LeaderboardService(prisma, redis);
const referralRewardService = new ReferralRewardService(prisma);

// Config for referral display (actual logic in ReferralRewardService)
const REFERRAL_CONFIG = {
  rewardPerFriend: 5,      // meters for new user (instant)
  friendBonus: 5,          // meters for L1 referrer (when user reaches level 2)
  l2Bonus: 1,              // meters for L2 referrer (when user reaches level 2)
  confirmationThreshold: 1000 // points needed for level 2
};

// Cache keys
const TASKS_CACHE_KEY = 'tasks:active';
const TASKS_CACHE_TTL = 300; // 5 minutes

// Rate limiter for verify endpoint (prevent spam)
const verifyLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 attempts per minute
  message: { error: 'Too Many Requests', message: 'Please wait before trying again' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: AuthRequest) => req.user?.telegramId?.toString() || req.ip || 'unknown'
});

/**
 * Get cached tasks or fetch from DB
 */
async function getCachedTasks() {
  try {
    const cached = await redis.get(TASKS_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {
    // Cache miss or error, continue to DB
  }

  const tasks = await prisma.socialTask.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' }
  });

  // Cache the result
  try {
    await redis.set(TASKS_CACHE_KEY, JSON.stringify(tasks), TASKS_CACHE_TTL);
  } catch (e) {
    // Ignore cache errors
  }

  return tasks;
}

/**
 * Invalidate tasks cache (call when tasks are updated)
 */
export async function invalidateTasksCache() {
  try {
    await redis.del(TASKS_CACHE_KEY);
  } catch (e) {
    logger.warn('Failed to invalidate tasks cache');
  }
}

/**
 * GET /api/tasks
 * Get all available tasks and user's completion status
 */
router.get('/',
  authMiddleware,
  async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;

      // Parallel queries for better performance
      const [tasks, completions, userWithReferrals] = await Promise.all([
        getCachedTasks(),
        prisma.userTaskCompletion.findMany({
          where: { userId },
          select: { taskId: true }
        }),
        prisma.user.findUnique({
          where: { id: userId },
          select: {
            referralCode: true,
            referrals: {
              select: {
                id: true,
                totalPoints: true
              }
            }
          }
        })
      ]);

      const completedTaskIds = new Set(completions.map(c => c.taskId));

      // Calculate referral stats from single query
      const totalInvited = userWithReferrals?.referrals.length || 0;
      const confirmedInvited = userWithReferrals?.referrals.filter(
        r => r.totalPoints >= REFERRAL_CONFIG.confirmationThreshold
      ).length || 0;

      res.json({
        tasks: tasks.map((task: any) => ({
          id: task.id,
          key: task.key,
          title: task.title,
          description: task.description,
          reward: task.reward,
          type: task.type,
          targetUrl: task.targetUrl,
          icon: task.icon,
          completed: completedTaskIds.has(task.id)
        })),
        referral: {
          code: userWithReferrals?.referralCode || '',
          totalInvited,
          confirmedInvited,
          ...REFERRAL_CONFIG
        }
      });
    } catch (error) {
      logger.error('Get tasks error:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get tasks'
      });
    }
  }
);

/**
 * GET /api/tasks/referrals
 * Get user's referral list with status
 * NOTE: This route MUST be before /:taskId to avoid conflict
 */
router.get('/referrals',
  authMiddleware,
  async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;

      const referrals = await prisma.user.findMany({
        where: { referredBy: userId },
        select: {
          id: true,
          username: true,
          firstName: true,
          totalPoints: true,
          joinedAt: true
        },
        orderBy: { joinedAt: 'desc' },
        take: 50
      });

      const referralList = referrals.map(r => ({
        id: r.id,
        name: r.username || r.firstName || 'User',
        level: Math.min(Math.floor(r.totalPoints / 1000) + 1, 10),
        points: r.totalPoints,
        joinedAt: r.joinedAt,
        confirmed: true // instant confirmation with new referral system
      }));

      res.json({
        referrals: referralList,
        total: referrals.length
      });
    } catch (error) {
      logger.error('Get referrals error:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get referrals'
      });
    }
  }
);

/**
 * POST /api/tasks/:taskId/verify
 * Verify task completion (e.g., check channel subscription)
 */
router.post('/:taskId/verify',
  authMiddleware,
  verifyLimiter,
  async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;
      const telegramId = req.user!.telegramId;
      const { taskId } = req.params;

      // Validate taskId format (UUID)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(taskId)) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid task ID format'
        });
        return;
      }

      // Get task and check existing completion in one transaction
      const task = await prisma.socialTask.findUnique({
        where: { id: taskId }
      });

      if (!task) {
        res.status(404).json({
          error: 'Not Found',
          message: 'Task not found'
        });
        return;
      }

      if (!task.isActive) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Task is no longer active'
        });
        return;
      }

      // Check if already completed
      const existingCompletion = await prisma.userTaskCompletion.findUnique({
        where: {
          userId_taskId: { userId, taskId }
        }
      });

      if (existingCompletion) {
        res.json({
          success: true,
          alreadyCompleted: true,
          message: 'Task already completed'
        });
        return;
      }

      // Verify based on task type
      let verified = false;
      let verificationError: string | null = null;

      if (task.type === 'telegram_channel' || task.type === 'telegram_group') {
        const result = await verifyTelegramMembership(task.targetId, telegramId, task.key);
        verified = result.verified;
        verificationError = result.error;

        if (result.serviceUnavailable) {
          res.status(503).json({
            error: 'Service Unavailable',
            message: verificationError || 'Verification temporarily unavailable'
          });
          return;
        }
      } else if (task.type === 'twitter_follow') {
        // Twitter verification would require OAuth - mark as manual for now
        res.status(400).json({
          error: 'Bad Request',
          message: 'Twitter verification requires manual approval'
        });
        return;
      } else {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Task type does not support automatic verification'
        });
        return;
      }

      if (!verified) {
        res.json({
          success: false,
          verified: false,
          message: verificationError || 'Please complete the task first'
        });
        return;
      }

      // Use transaction with upsert to prevent race condition double-claims
      const result = await prisma.$transaction(async (tx) => {
        // Use upsert to atomically check-and-create, preventing race conditions
        // If record exists, this is a no-op; if not, it creates it
        const completion = await tx.userTaskCompletion.upsert({
          where: { userId_taskId: { userId, taskId } },
          create: {
            userId,
            taskId,
            pointsAwarded: task.reward
          },
          update: {} // Do nothing if exists - this prevents duplicate rewards
        });

        // Check if this was an existing completion (created before this request)
        // by comparing timestamps - if completedAt is more than 1 second old, it existed
        const isExisting = completion.completedAt.getTime() < Date.now() - 1000;
        if (isExisting) {
          return { alreadyCompleted: true };
        }

        // Create point transaction
        await tx.pointTransaction.create({
          data: {
            userId,
            points: task.reward,
            activityType: 'social_task',
            description: `Completed: ${task.title}`,
            metadata: {
              taskId: task.id,
              taskKey: task.key
            }
          }
        });

        // Update user's total points
        const updatedUser = await tx.user.update({
          where: { id: userId },
          data: {
            totalPoints: { increment: task.reward },
            lastActivity: new Date()
          },
          select: { totalPoints: true }
        });

        return {
          alreadyCompleted: false,
          totalPoints: updatedUser.totalPoints
        };
      });

      if (result.alreadyCompleted) {
        res.json({
          success: true,
          alreadyCompleted: true,
          message: 'Task already completed'
        });
        return;
      }

      // Update leaderboard (outside transaction for performance)
      await leaderboardService.updateUserPosition(userId, result.totalPoints!);

      // Check if user reached level 2 and trigger referral rewards
      await referralRewardService.checkAndAwardReferralRewards(userId, leaderboardService);

      logger.info('Task completed', {
        userId,
        taskId,
        taskKey: task.key,
        reward: task.reward
      });

      res.json({
        success: true,
        verified: true,
        reward: task.reward,
        message: `+${task.reward} meters!`
      });
    } catch (error) {
      logger.error('Verify task error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to verify task'
      });
    }
  }
);

/**
 * Verify Telegram channel/group membership
 */
async function verifyTelegramMembership(
  targetId: string,
  telegramId: bigint,
  taskKey: string
): Promise<{ verified: boolean; error: string | null; serviceUnavailable: boolean }> {
  try {
    const bot = telegramBot.getBot();
    const chatId = targetId.startsWith('@') ? targetId : `@${targetId}`;

    const member = await bot.api.getChatMember(chatId, Number(telegramId));

    // Valid member statuses (not 'left', 'kicked', 'restricted')
    const validStatuses = ['member', 'administrator', 'creator'];
    const verified = validStatuses.includes(member.status);

    logger.info('Channel subscription check', {
      taskKey,
      chatId,
      status: member.status,
      verified
    });

    return {
      verified,
      error: verified ? null : 'Please subscribe to the channel first',
      serviceUnavailable: false
    };
  } catch (apiError) {
    const errorMsg = apiError instanceof Error ? apiError.message : 'Unknown error';

    if (errorMsg.includes('user not found')) {
      return {
        verified: false,
        error: 'Please subscribe to the channel first',
        serviceUnavailable: false
      };
    }

    if (errorMsg.includes('chat not found') || errorMsg.includes('bot was kicked')) {
      logger.error('Bot not in channel', { taskKey, targetId });
      return {
        verified: false,
        error: 'Verification temporarily unavailable. Try again later.',
        serviceUnavailable: true
      };
    }

    // Re-throw unexpected errors
    throw apiError;
  }
}

export default router;
