import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger.js';

export interface VisitResult {
  isNewDay: boolean;
  currentStreak: number;
  maxStreak: number;
  streakReset: boolean;
}

/**
 * Service for tracking daily visit streaks based on calendar days (UTC)
 */
export class VisitStreakService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Process a user visit and update streak accordingly
   * - If today already visited → no change
   * - If yesterday visited → streak +1
   * - If missed day(s) → streak = 1
   * Uses UTC calendar days
   */
  async processVisit(userId: string): Promise<VisitResult> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          lastCheckIn: true,
          currentStreak: true,
          maxStreak: true,
        },
      });

      if (!user) {
        logger.warn('User not found for visit processing', { userId });
        return {
          isNewDay: false,
          currentStreak: 0,
          maxStreak: 0,
          streakReset: false,
        };
      }

      const now = new Date();
      const todayUTC = this.getUTCDateString(now);
      const lastCheckIn = user.lastCheckIn;

      // If no previous check-in, this is the first visit
      if (!lastCheckIn) {
        const updated = await this.prisma.user.update({
          where: { id: userId },
          data: {
            lastCheckIn: now,
            currentStreak: 1,
            maxStreak: Math.max(1, user.maxStreak),
          },
        });

        logger.info('First visit recorded', { userId, streak: 1 });

        return {
          isNewDay: true,
          currentStreak: 1,
          maxStreak: updated.maxStreak,
          streakReset: false,
        };
      }

      const lastCheckInUTC = this.getUTCDateString(lastCheckIn);

      // Already visited today
      if (todayUTC === lastCheckInUTC) {
        return {
          isNewDay: false,
          currentStreak: user.currentStreak,
          maxStreak: user.maxStreak,
          streakReset: false,
        };
      }

      // Check if yesterday was visited
      const yesterdayUTC = this.getUTCDateString(new Date(now.getTime() - 24 * 60 * 60 * 1000));
      const isConsecutive = lastCheckInUTC === yesterdayUTC;

      let newStreak: number;
      let streakReset = false;

      if (isConsecutive) {
        // Consecutive day - increment streak
        newStreak = user.currentStreak + 1;
      } else {
        // Missed day(s) - reset streak
        newStreak = 1;
        streakReset = true;
      }

      const newMaxStreak = Math.max(newStreak, user.maxStreak);

      const updated = await this.prisma.user.update({
        where: { id: userId },
        data: {
          lastCheckIn: now,
          currentStreak: newStreak,
          maxStreak: newMaxStreak,
        },
      });

      logger.info('Visit streak updated', {
        userId,
        previousStreak: user.currentStreak,
        newStreak,
        streakReset,
        maxStreak: newMaxStreak,
      });

      return {
        isNewDay: true,
        currentStreak: newStreak,
        maxStreak: newMaxStreak,
        streakReset,
      };
    } catch (error) {
      logger.error('Failed to process visit:', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        isNewDay: false,
        currentStreak: 0,
        maxStreak: 0,
        streakReset: false,
      };
    }
  }

  /**
   * Get UTC date string in YYYY-MM-DD format
   */
  private getUTCDateString(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Get user's current streak info without modifying it
   */
  async getStreakInfo(userId: string): Promise<{
    currentStreak: number;
    maxStreak: number;
    lastCheckIn: Date | null;
    visitedToday: boolean;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        lastCheckIn: true,
        currentStreak: true,
        maxStreak: true,
      },
    });

    if (!user) {
      return {
        currentStreak: 0,
        maxStreak: 0,
        lastCheckIn: null,
        visitedToday: false,
      };
    }

    const todayUTC = this.getUTCDateString(new Date());
    const lastCheckInUTC = user.lastCheckIn ? this.getUTCDateString(user.lastCheckIn) : null;
    const visitedToday = todayUTC === lastCheckInUTC;

    return {
      currentStreak: user.currentStreak,
      maxStreak: user.maxStreak,
      lastCheckIn: user.lastCheckIn,
      visitedToday,
    };
  }
}
