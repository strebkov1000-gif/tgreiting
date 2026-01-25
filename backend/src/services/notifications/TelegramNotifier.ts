import { Bot, InlineKeyboard } from 'grammy';
import { Achievement } from '@prisma/client';
import { logger } from '../../utils/logger.js';

export interface NotificationPayload {
  userId: string;
  type: 'achievement' | 'streak_reminder' | 'nft_detected' | 'rank_change';
  data: any;
}

export class TelegramNotifier {
  constructor(
    private bot: Bot
  ) {}

  /**
   * Send notification to user
   */
  async sendNotification(
    telegramId: bigint,
    message: string,
    options?: {
      parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
      keyboard?: InlineKeyboard;
      disableNotification?: boolean;
    }
  ): Promise<void> {
    try {
      await this.bot.api.sendMessage(Number(telegramId), message, {
        parse_mode: options?.parseMode,
        reply_markup: options?.keyboard,
        disable_notification: options?.disableNotification
      });

      logger.debug('Notification sent', {
        telegramId: telegramId.toString(),
        messageLength: message.length
      });
    } catch (error) {
      logger.error('Failed to send notification:', {
        telegramId: telegramId.toString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      // Don't throw - notifications are non-critical
    }
  }

  /**
   * Send achievement unlock notification
   */
  async notifyAchievementUnlock(
    telegramId: bigint,
    achievement: Achievement
  ): Promise<void> {
    try {
      const message = `🎉 <b>Achievement Unlocked!</b>\n\n` +
        `<b>${achievement.icon} ${achievement.name}</b>\n` +
        `${achievement.description}\n\n` +
        `💰 Reward: <b>+${achievement.pointsReward} points</b>`;

      const keyboard = new InlineKeyboard()
        .url('View Profile', `https://t.me/${process.env.BOT_USERNAME || 'your_bot'}?start=profile`);

      await this.sendNotification(telegramId, message, {
        parseMode: 'HTML',
        keyboard
      });

      logger.info('Achievement notification sent', {
        telegramId: telegramId.toString(),
        achievementKey: achievement.key
      });
    } catch (error) {
      logger.error('Failed to send achievement notification:', {
        telegramId: telegramId.toString(),
        achievementKey: achievement.key,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Send streak reminder notification
   */
  async notifyStreakReminder(
    telegramId: bigint,
    currentStreak: number
  ): Promise<void> {
    try {
      const message = `🔥 <b>Streak Reminder!</b>\n\n` +
        `Your current streak: <b>${currentStreak} days</b>\n\n` +
        `Don't forget to check in today to keep your streak going! 💪`;

      const keyboard = new InlineKeyboard()
        .url('Check In Now', `https://t.me/${process.env.BOT_USERNAME || 'your_bot'}?start=checkin`);

      await this.sendNotification(telegramId, message, {
        parseMode: 'HTML',
        keyboard
      });

      logger.info('Streak reminder sent', {
        telegramId: telegramId.toString(),
        currentStreak
      });
    } catch (error) {
      logger.error('Failed to send streak reminder:', {
        telegramId: telegramId.toString(),
        currentStreak,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Send NFT detection notification
   */
  async notifyNftDetected(
    telegramId: bigint,
    nftCount: number,
    points: number
  ): Promise<void> {
    try {
      const message = `🎨 <b>New NFTs Detected!</b>\n\n` +
        `We found <b>${nftCount} new NFT${nftCount > 1 ? 's' : ''}</b> in your wallet!\n\n` +
        `💰 You earned <b>+${points} points</b>`;

      const keyboard = new InlineKeyboard()
        .url('View Collection', `https://t.me/${process.env.BOT_USERNAME || 'your_bot'}?start=nfts`);

      await this.sendNotification(telegramId, message, {
        parseMode: 'HTML',
        keyboard
      });

      logger.info('NFT detection notification sent', {
        telegramId: telegramId.toString(),
        nftCount,
        points
      });
    } catch (error) {
      logger.error('Failed to send NFT notification:', {
        telegramId: telegramId.toString(),
        nftCount,
        points,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Send rank change notification
   */
  async notifyRankChange(
    telegramId: bigint,
    oldRank: number,
    newRank: number
  ): Promise<void> {
    try {
      const improved = newRank < oldRank;
      const emoji = improved ? '📈' : '📉';
      const action = improved ? 'improved' : 'changed';
      const diff = Math.abs(oldRank - newRank);

      const message = `${emoji} <b>Rank ${action.charAt(0).toUpperCase() + action.slice(1)}!</b>\n\n` +
        `Your rank: <b>#${oldRank}</b> → <b>#${newRank}</b>\n` +
        `${improved ? `You moved up ${diff} position${diff > 1 ? 's' : ''}! 🎉` : ''}`;

      const keyboard = new InlineKeyboard()
        .url('View Leaderboard', `https://t.me/${process.env.BOT_USERNAME || 'your_bot'}?start=leaderboard`);

      await this.sendNotification(telegramId, message, {
        parseMode: 'HTML',
        keyboard
      });

      logger.info('Rank change notification sent', {
        telegramId: telegramId.toString(),
        oldRank,
        newRank
      });
    } catch (error) {
      logger.error('Failed to send rank change notification:', {
        telegramId: telegramId.toString(),
        oldRank,
        newRank,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Send referral notification (someone used your referral code)
   */
  async notifyReferralSuccess(
    telegramId: bigint,
    referredUserName: string,
    points: number
  ): Promise<void> {
    try {
      const message = `👥 <b>New Referral!</b>\n\n` +
        `<b>${referredUserName}</b> joined using your referral code!\n\n` +
        `💰 You earned <b>+${points} points</b>`;

      const keyboard = new InlineKeyboard()
        .url('Share More', `https://t.me/${process.env.BOT_USERNAME || 'your_bot'}?start=referral`);

      await this.sendNotification(telegramId, message, {
        parseMode: 'HTML',
        keyboard
      });

      logger.info('Referral notification sent', {
        telegramId: telegramId.toString(),
        referredUserName,
        points
      });
    } catch (error) {
      logger.error('Failed to send referral notification:', {
        telegramId: telegramId.toString(),
        referredUserName,
        points,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Send welcome notification (after /start command)
   */
  async notifyWelcome(
    telegramId: bigint,
    firstName: string,
    referralCode: string
  ): Promise<void> {
    try {
      const message = `👋 <b>Welcome, ${firstName}!</b>\n\n` +
        `You've joined the Ice Rating community! 🧊\n\n` +
        `Start earning points by:\n` +
        `• Daily check-ins 📅\n` +
        `• Connecting your TON wallet 💼\n` +
        `• Collecting NFTs 🎨\n` +
        `• Referring friends 👥\n\n` +
        `Your referral code: <code>${referralCode}</code>`;

      const keyboard = new InlineKeyboard()
        .url('Open Mini App', `https://t.me/${process.env.BOT_USERNAME || 'your_bot'}?start=app`);

      await this.sendNotification(telegramId, message, {
        parseMode: 'HTML',
        keyboard
      });

      logger.info('Welcome notification sent', {
        telegramId: telegramId.toString(),
        firstName
      });
    } catch (error) {
      logger.error('Failed to send welcome notification:', {
        telegramId: telegramId.toString(),
        firstName,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Send batch notifications (for background jobs)
   */
  async sendBatchNotifications(notifications: NotificationPayload[]): Promise<void> {
    logger.info('Sending batch notifications', { count: notifications.length });

    for (const notification of notifications) {
      try {
        // Add delay between notifications to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100));

        // Process notification based on type
        // This would need user's telegramId lookup
        // Simplified for now

        logger.debug('Batch notification processed', {
          userId: notification.userId,
          type: notification.type
        });
      } catch (error) {
        logger.error('Failed to send batch notification:', {
          userId: notification.userId,
          type: notification.type,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    logger.info('Batch notifications completed');
  }
}
