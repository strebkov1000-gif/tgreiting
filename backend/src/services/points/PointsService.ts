import { PrismaClient, PointTransaction } from '@prisma/client';
import { logger } from '../../utils/logger.js';

export interface PointsCalculationConfig {
  basePoints: number;
  nftMultiplier?: number;
  chatBoost?: number;
  streakMultiplier?: number;
}

export interface PointsTransactionInput {
  userId: string;
  points: number;
  activityType: 'nft_detected' | 'referral' | 'daily_checkin' | 'achievement' | 'chat_boost' | 'social_task' | 'hold_bonus';
  metadata?: Record<string, any>;
  description?: string;
}

export class PointsService {
  constructor(
    private prisma: PrismaClient
  ) {}

  /**
   * Calculate points with all multipliers applied
   * Formula: basePoints * (1 + nftMultiplier) * chatBoost * streakMultiplier
   */
  calculatePoints(config: PointsCalculationConfig): number {
    const {
      basePoints,
      nftMultiplier = 0,
      chatBoost = 1.0,
      streakMultiplier = 1.0
    } = config;

    // Apply formula
    const totalPoints = Math.floor(
      basePoints * (1 + nftMultiplier) * chatBoost * streakMultiplier
    );

    logger.debug('Points calculated', {
      basePoints,
      nftMultiplier,
      chatBoost,
      streakMultiplier,
      totalPoints
    });

    return totalPoints;
  }

  /**
   * Award points to user and create transaction record
   * Updates both User.totalPoints and creates PointTransaction
   * Uses Prisma transaction for consistency
   */
  async awardPoints(transaction: PointsTransactionInput): Promise<PointTransaction> {
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // Create point transaction record
        const pointTransaction = await tx.pointTransaction.create({
          data: {
            userId: transaction.userId,
            points: transaction.points,
            activityType: transaction.activityType,
            metadata: transaction.metadata || {},
            description: transaction.description
          }
        });

        // Update user's total points
        await tx.user.update({
          where: { id: transaction.userId },
          data: {
            totalPoints: {
              increment: transaction.points
            },
            lastActivity: new Date()
          }
        });

        logger.info('Points awarded', {
          userId: transaction.userId,
          points: transaction.points,
          activityType: transaction.activityType,
          transactionId: pointTransaction.id
        });

        return pointTransaction;
      });

      return result;
    } catch (error) {
      logger.error('Failed to award points', {
        userId: transaction.userId,
        points: transaction.points,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error('Failed to award points');
    }
  }

  /**
   * Get user's point transaction history with pagination
   */
  async getUserPointHistory(
    userId: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<PointTransaction[]> {
    try {
      const transactions = await this.prisma.pointTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      });

      return transactions;
    } catch (error) {
      logger.error('Failed to get point history', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error('Failed to get point history');
    }
  }

  /**
   * Get user's total points grouped by activity type
   * Returns breakdown like { daily_checkin: 500, referral: 300, nft_detected: 1200 }
   */
  async getPointsByActivityType(userId: string): Promise<Record<string, number>> {
    try {
      const transactions = await this.prisma.pointTransaction.findMany({
        where: { userId },
        select: {
          activityType: true,
          points: true
        }
      });

      // Group by activity type and sum points
      const breakdown: Record<string, number> = {};

      for (const transaction of transactions) {
        const type = transaction.activityType;
        breakdown[type] = (breakdown[type] || 0) + transaction.points;
      }

      logger.debug('Points breakdown', { userId, breakdown });

      return breakdown;
    } catch (error) {
      logger.error('Failed to get points by activity type', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error('Failed to get points breakdown');
    }
  }

  /**
   * Get total points for a specific activity type
   */
  async getTotalPointsByType(userId: string, activityType: string): Promise<number> {
    try {
      const result = await this.prisma.pointTransaction.aggregate({
        where: {
          userId,
          activityType
        },
        _sum: {
          points: true
        }
      });

      return result._sum.points || 0;
    } catch (error) {
      logger.error('Failed to get total points by type', {
        userId,
        activityType,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error('Failed to get total points by type');
    }
  }

  /**
   * Get user's total points
   */
  async getUserTotalPoints(userId: string): Promise<number> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { totalPoints: true }
      });

      return user?.totalPoints || 0;
    } catch (error) {
      logger.error('Failed to get user total points', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error('Failed to get user total points');
    }
  }
}
