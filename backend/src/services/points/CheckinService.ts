import { PrismaClient } from '@prisma/client';
import { differenceInHours, addDays } from 'date-fns';
import { logger } from '../../utils/logger.js';
import { PointsService } from './PointsService.js';

export interface CheckinResult {
  success: boolean;
  points: number;
  currentStreak: number;
  isNewRecord: boolean;
  nextCheckInAvailable: Date;
}

export class CheckinService {
  constructor(
    private prisma: PrismaClient,
    private pointsService: PointsService
  ) {}

  /**
   * Perform daily check-in for user
   * - Checks if 24h have passed since last check-in
   * - Updates streak (increment or reset)
   * - Awards points with streak multiplier
   */
  async performCheckin(userId: string): Promise<CheckinResult> {
    try {
      // Get user data
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          lastCheckIn: true,
          currentStreak: true,
          maxStreak: true,
          totalPoints: true,
          nftCount: true
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Check if user can check in
      const now = new Date();

      if (user.lastCheckIn) {
        const hoursSinceLastCheckIn = differenceInHours(now, user.lastCheckIn);

        if (hoursSinceLastCheckIn < 24) {
          const nextCheckIn = addDays(user.lastCheckIn, 1);
          throw new Error(`Already checked in today. Next check-in available at ${nextCheckIn.toISOString()}`);
        }
      }

      // Update streak
      const { currentStreak, maxStreak } = await this.updateStreak(userId);

      // Calculate points with streak multiplier
      const basePoints = 10;
      const streakMultiplier = this.calculateStreakMultiplier(currentStreak);

      // Get NFT multiplier (simplified - you can enhance this)
      const nftMultiplier = user.nftCount > 0 ? 0.1 * Math.min(user.nftCount, 10) : 0;

      // Get chat boost (you can check if user is in IceGang chat)
      const chatBoost = 1.0; // Default, can be enhanced

      const points = this.pointsService.calculatePoints({
        basePoints,
        nftMultiplier,
        chatBoost,
        streakMultiplier
      });

      // Award points
      await this.pointsService.awardPoints({
        userId,
        points,
        activityType: 'daily_checkin',
        description: `Daily check-in (streak: ${currentStreak})`,
        metadata: {
          streak: currentStreak,
          streakMultiplier,
          nftMultiplier,
          chatBoost
        }
      });

      // Check if new record
      const isNewRecord = currentStreak > maxStreak;

      const nextCheckInAvailable = addDays(now, 1);

      logger.info('Check-in successful', {
        userId,
        currentStreak,
        points,
        isNewRecord
      });

      return {
        success: true,
        points,
        currentStreak,
        isNewRecord,
        nextCheckInAvailable
      };
    } catch (error) {
      logger.error('Check-in failed', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Check if user can check in (24h passed)
   */
  async canCheckIn(userId: string): Promise<boolean> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { lastCheckIn: true }
      });

      if (!user || !user.lastCheckIn) {
        return true; // First check-in
      }

      const hoursSinceLastCheckIn = differenceInHours(new Date(), user.lastCheckIn);
      return hoursSinceLastCheckIn >= 24;
    } catch (error) {
      logger.error('Failed to check if user can check in', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Calculate streak multiplier based on streak length
   * Day 1-6: 1.0x
   * Day 7-29: 1.5x
   * Day 30+: 2.0x
   */
  private calculateStreakMultiplier(streak: number): number {
    if (streak >= 30) {
      return 2.0;
    } else if (streak >= 7) {
      return 1.5;
    } else {
      return 1.0;
    }
  }

  /**
   * Update user's streak
   * - If >48h passed: reset to 1
   * - If 24-48h passed: increment by 1
   * - Update maxStreak if new record
   */
  private async updateStreak(userId: string): Promise<{ currentStreak: number; maxStreak: number }> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          lastCheckIn: true,
          currentStreak: true,
          maxStreak: true
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      const now = new Date();
      let currentStreak = 1;

      if (user.lastCheckIn) {
        const hoursSinceLastCheckIn = differenceInHours(now, user.lastCheckIn);

        if (hoursSinceLastCheckIn > 48) {
          // Streak broken, reset to 1
          currentStreak = 1;
          logger.info('Streak reset', { userId, previousStreak: user.currentStreak });
        } else {
          // Continue streak
          currentStreak = user.currentStreak + 1;
        }
      }

      // Update max streak if new record
      const maxStreak = Math.max(currentStreak, user.maxStreak);

      // Update user in database
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          currentStreak,
          maxStreak,
          lastCheckIn: now
        }
      });

      return { currentStreak, maxStreak };
    } catch (error) {
      logger.error('Failed to update streak', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error('Failed to update streak');
    }
  }

  /**
   * Get time until next check-in is available
   */
  async getNextCheckInTime(userId: string): Promise<Date | null> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { lastCheckIn: true }
      });

      if (!user || !user.lastCheckIn) {
        return null; // Can check in now
      }

      const nextCheckIn = addDays(user.lastCheckIn, 1);
      const now = new Date();

      if (now >= nextCheckIn) {
        return null; // Can check in now
      }

      return nextCheckIn;
    } catch (error) {
      logger.error('Failed to get next check-in time', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  /**
   * Get user's streak stats
   */
  async getStreakStats(userId: string): Promise<{
    currentStreak: number;
    maxStreak: number;
    multiplier: number;
    canCheckIn: boolean;
    nextCheckIn: Date | null;
  }> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          currentStreak: true,
          maxStreak: true,
          lastCheckIn: true
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      const canCheckIn = await this.canCheckIn(userId);
      const nextCheckIn = await this.getNextCheckInTime(userId);
      const multiplier = this.calculateStreakMultiplier(user.currentStreak);

      return {
        currentStreak: user.currentStreak,
        maxStreak: user.maxStreak,
        multiplier,
        canCheckIn,
        nextCheckIn
      };
    } catch (error) {
      logger.error('Failed to get streak stats', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error('Failed to get streak stats');
    }
  }
}
