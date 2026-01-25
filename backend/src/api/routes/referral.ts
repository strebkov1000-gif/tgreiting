import { Router } from 'express';
import { validate } from '../middleware/validation.js';
import { AuthRequest } from '../middleware/auth.js';
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
 */
router.get('/stats/:telegramId',
  validate(z.object({
    params: z.object({
      telegramId: z.string().regex(/^\d+$/)
    })
  })),
  async (req: AuthRequest, res) => {
    try {
      const { telegramId } = req.params;

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

      // Calculate total points earned from referrals
      const referralPoints = await prisma.pointTransaction.aggregate({
        where: {
          userId: user.id,
          activityType: 'referral'
        },
        _sum: {
          points: true
        }
      });

      // Get referral link
      const botUsername = process.env.BOT_USERNAME || 'your_bot';
      const referralLink = `https://t.me/${botUsername}?start=${user.referralCode}`;

      res.json({
        referralCode: user.referralCode,
        referralLink,
        totalReferrals: user.referrals.length,
        totalPointsEarned: referralPoints._sum.points || 0,
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
