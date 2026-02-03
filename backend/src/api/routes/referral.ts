import { Router } from 'express';
import { validate } from '../middleware/validation.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { logger } from '../../utils/logger.js';
import { prisma } from '../../database/prisma/client.js';
import { z } from 'zod';

const router = Router();

/**
 * GET /api/referral/:code
 * Get referral information by referral code
 */
router.get('/:code',
  validate(z.object({
    params: z.object({
      code: z.string().min(1)
    })
  })),
  async (req: AuthRequest, res) => {
    try {
      const { code } = req.params;

      const referrer = await prisma.user.findUnique({
        where: { referralCode: code },
        select: {
          id: true,
          username: true,
          firstName: true,
          totalPoints: true,
          _count: {
            select: {
              referrals: true
            }
          }
        }
      });

      if (!referrer) {
        res.status(404).json({
          error: 'Not Found',
          message: 'Invalid referral code'
        });
        return;
      }

      res.json({
        referrer: {
          username: referrer.username,
          firstName: referrer.firstName,
          totalPoints: referrer.totalPoints,
          referralCount: referrer._count.referrals
        },
        code
      });
    } catch (error) {
      logger.error('Get referral error:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get referral info'
      });
    }
  }
);

/**
 * GET /api/referral/stats/:telegramId
 * Get user's referral statistics
 * SECURITY: Requires auth and user can only access their own stats
 */
router.get('/stats/:telegramId',
  authMiddleware,
  validate(z.object({
    params: z.object({
      telegramId: z.string().regex(/^\d+$/)
    })
  })),
  async (req: AuthRequest, res) => {
    try {
      const { telegramId } = req.params;

      // SECURITY: Verify user can only access their own referral stats
      if (req.user!.telegramId.toString() !== telegramId) {
        logger.warn('Unauthorized referral stats access attempt', {
          requestedId: telegramId,
          actualId: req.user!.telegramId.toString()
        });
        res.status(403).json({
          error: 'Forbidden',
          message: 'You can only access your own referral statistics'
        });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { telegramId: BigInt(telegramId) },
        include: {
          referrals: {
            select: {
              id: true,
              username: true,
              firstName: true,
              totalPoints: true,
              joinedAt: true
            },
            orderBy: {
              joinedAt: 'desc'
            },
            take: 50 // Limit to 50 most recent referrals
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

      // Calculate total points earned from all referral levels (L1 and L2 only)
      const referralPoints = await prisma.pointTransaction.aggregate({
        where: {
          userId: user.id,
          activityType: { in: ['referral', 'referral_l2'] }
        },
        _sum: {
          points: true
        }
      });

      // Get referral link
      const botUsername = process.env.BOT_USERNAME || 'IceTopbot';
      const referralLink = `https://t.me/${botUsername}?start=${user.referralCode}`;

      // Get total referral count for milestone tracking
      const totalReferralCount = await prisma.user.count({
        where: { referredBy: user.id }
      });

      // Milestone bonuses info
      const milestones = {
        current: totalReferralCount,
        next: totalReferralCount < 50 ? 50 : totalReferralCount < 100 ? 100 : null,
        progress: totalReferralCount < 50
          ? { target: 50, remaining: 50 - totalReferralCount, reward: '500 meters' }
          : totalReferralCount < 100
            ? { target: 100, remaining: 100 - totalReferralCount, reward: '1000 meters + task event' }
            : null,
        taskEventUnlocked: totalReferralCount >= 100,
        taskEventContact: totalReferralCount >= 100 ? '@baron_creator' : null
      };

      res.json({
        referralCode: user.referralCode,
        referralLink,
        totalReferrals: user.referrals.length,
        totalPointsEarned: referralPoints._sum.points || 0,
        milestones,
        referrals: user.referrals.map(ref => ({
          username: ref.username,
          firstName: ref.firstName,
          points: ref.totalPoints,
          joinedAt: ref.joinedAt
        }))
      });
    } catch (error) {
      logger.error('Get referral stats error:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get referral statistics'
      });
    }
  }
);

export default router;
