import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger.js';

/**
 * Service to handle referral rewards when users reach level 2
 *
 * Reward structure:
 * - New user gets +5m instantly on registration
 * - L1 referrer (who invited the user) gets +5m when user reaches level 2
 * - L2 referrer (who invited the L1 referrer) gets +1m when user reaches level 2
 *
 * Milestone bonuses for L1 referrer:
 * - 50 confirmed referrals = +500m
 * - 100 confirmed referrals = +1000m
 */
export class ReferralRewardService {
  private prisma: PrismaClient;

  // Level 2 threshold (1000 points)
  private readonly LEVEL_2_THRESHOLD = 1000;

  // Reward amounts
  private readonly L1_REWARD = 5;  // L1 referrer gets 5m
  private readonly L2_REWARD = 1;  // L2 referrer gets 1m
  private readonly NEW_USER_BONUS = 5; // New user gets 5m for registering via referral

  // Milestone bonuses
  private readonly MILESTONE_50_BONUS = 500;
  private readonly MILESTONE_100_BONUS = 1000;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Calculate user level from points
   */
  private calculateLevel(points: number): number {
    return Math.min(Math.floor(points / 1000) + 1, 10);
  }

  /**
   * Award bonus to new user who registered via referral link
   * Called when a new user registers with a referral code
   */
  async awardNewUserBonus(userId: string): Promise<void> {
    try {
      // Check if already awarded
      const existingBonus = await this.prisma.pointTransaction.findFirst({
        where: {
          userId,
          activityType: 'referral_welcome_bonus'
        }
      });

      if (existingBonus) {
        logger.info(`New user bonus already awarded to ${userId}`);
        return;
      }

      // Award bonus
      await this.prisma.pointTransaction.create({
        data: {
          userId,
          points: this.NEW_USER_BONUS,
          activityType: 'referral_welcome_bonus',
          description: 'Welcome bonus for joining via referral'
        }
      });

      await this.prisma.user.update({
        where: { id: userId },
        data: { totalPoints: { increment: this.NEW_USER_BONUS } }
      });

      logger.info(`Awarded ${this.NEW_USER_BONUS}m welcome bonus to new user ${userId}`);
    } catch (error) {
      logger.error('Error awarding new user bonus:', error);
    }
  }

  /**
   * Check and award referral rewards when a user reaches level 2
   * Should be called after any points update
   */
  async checkAndAwardReferralRewards(userId: string, leaderboardService?: any): Promise<void> {
    try {
      // Get user with their referrer info
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          totalPoints: true,
          referredBy: true,
          firstName: true,
          username: true
        }
      });

      if (!user || !user.referredBy) {
        return; // No referrer, nothing to do
      }

      // SECURITY: Prevent self-referral exploit
      if (user.id === user.referredBy) {
        logger.warn('Self-referral detected, skipping rewards', { userId });
        return;
      }

      const userLevel = this.calculateLevel(user.totalPoints);

      if (userLevel < 2) {
        return; // Not level 2 yet
      }

      // Check if L1 reward already paid for this user
      const l1RewardPaid = await this.prisma.pointTransaction.findFirst({
        where: {
          userId: user.referredBy,
          activityType: 'referral_l1_confirmed',
          metadata: {
            path: ['referralUserId'],
            equals: userId
          }
        }
      });

      if (l1RewardPaid) {
        return; // Already paid
      }

      // Get L1 referrer
      const l1Referrer = await this.prisma.user.findUnique({
        where: { id: user.referredBy },
        select: {
          id: true,
          referredBy: true,
          _count: {
            select: { referrals: true }
          }
        }
      });

      if (!l1Referrer) {
        return;
      }

      // Count confirmed referrals (users who reached level 2)
      const confirmedReferrals = await this.prisma.pointTransaction.count({
        where: {
          userId: l1Referrer.id,
          activityType: 'referral_l1_confirmed'
        }
      });

      const newConfirmedCount = confirmedReferrals + 1;

      // Check milestone bonuses
      let bonusPoints = 0;
      let bonusDescription = '';

      if (newConfirmedCount === 50) {
        bonusPoints = this.MILESTONE_50_BONUS;
        bonusDescription = ' + 500m milestone bonus for 50 referrals!';
      } else if (newConfirmedCount === 100) {
        bonusPoints = this.MILESTONE_100_BONUS;
        bonusDescription = ' + 1000m milestone bonus for 100 referrals! Contact @baron_creator';
      }

      const totalL1Points = this.L1_REWARD + bonusPoints;
      const userName = user.firstName || user.username || 'User';

      // Award L1 referrer
      await this.prisma.pointTransaction.create({
        data: {
          userId: l1Referrer.id,
          points: totalL1Points,
          activityType: 'referral_l1_confirmed',
          description: `${userName} reached level 2${bonusDescription}`,
          metadata: { referralUserId: userId }
        }
      });

      const updatedL1 = await this.prisma.user.update({
        where: { id: l1Referrer.id },
        data: { totalPoints: { increment: totalL1Points } }
      });

      if (leaderboardService) {
        await leaderboardService.updateUserPosition(l1Referrer.id, updatedL1.totalPoints);
      }

      logger.info(`Referral L1 confirmed: ${l1Referrer.id} gets ${totalL1Points}m for ${userId} reaching level 2 (confirmed refs: ${newConfirmedCount})`);

      // Check for L2 referrer
      if (l1Referrer.referredBy) {
        // Check if L2 reward already paid
        const l2RewardPaid = await this.prisma.pointTransaction.findFirst({
          where: {
            userId: l1Referrer.referredBy,
            activityType: 'referral_l2_confirmed',
            metadata: {
              path: ['referralUserId'],
              equals: userId
            }
          }
        });

        if (!l2RewardPaid) {
          const l2Referrer = await this.prisma.user.findUnique({
            where: { id: l1Referrer.referredBy },
            select: { id: true }
          });

          if (l2Referrer) {
            await this.prisma.pointTransaction.create({
              data: {
                userId: l2Referrer.id,
                points: this.L2_REWARD,
                activityType: 'referral_l2_confirmed',
                description: `Referral chain bonus (L2): ${userName} reached level 2`,
                metadata: { referralUserId: userId, l1ReferrerId: l1Referrer.id }
              }
            });

            const updatedL2 = await this.prisma.user.update({
              where: { id: l2Referrer.id },
              data: { totalPoints: { increment: this.L2_REWARD } }
            });

            if (leaderboardService) {
              await leaderboardService.updateUserPosition(l2Referrer.id, updatedL2.totalPoints);
            }

            logger.info(`Referral L2 confirmed: ${l2Referrer.id} gets ${this.L2_REWARD}m for ${userId} reaching level 2`);
          }
        }
      }
    } catch (error) {
      logger.error('Error checking referral rewards:', error);
    }
  }
}
