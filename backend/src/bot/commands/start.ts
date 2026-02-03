import { CommandContext } from 'grammy';
import { BotContext } from '../index.js';
import { config } from '../../config/index.js';
import { prisma } from '../../database/prisma/client.js';
import { redis } from '../../database/redis/client.js';
import { LeaderboardService } from '../../services/leaderboard/LeaderboardService.js';
import { VisitStreakService } from '../../services/streak/VisitStreakService.js';
import { AchievementChecker } from '../../services/achievements/AchievementChecker.js';
import { AchievementService } from '../../services/achievements/AchievementService.js';
import { PointsService } from '../../services/points/PointsService.js';
import { ReferralRewardService } from '../../services/referral/ReferralRewardService.js';
import { logger } from '../../utils/logger.js';

const leaderboardService = new LeaderboardService(prisma, redis);
const visitStreakService = new VisitStreakService(prisma);
const pointsService = new PointsService(prisma);
const achievementService = new AchievementService(prisma, pointsService);
const achievementChecker = new AchievementChecker(prisma, achievementService);
const referralRewardService = new ReferralRewardService(prisma);

export async function startCommand(ctx: CommandContext<BotContext>) {
  try {
    const userId = ctx.session.userId;
    const firstName = ctx.from?.first_name || 'User';

    // Check if there's a referral code in the command
    const args = ctx.match;
    const referralCode = args && typeof args === 'string' ? args.trim() : null;

    // Handle referral system:
    // - New user gets +5m instantly on registration
    // - L1 referrer gets +5m when new user reaches level 2
    // - L2 referrer gets +1m when new user reaches level 2
    // - Milestone bonuses: 50 refs = +500m, 100 refs = +1000m
    // IMPORTANT: Only process referrals for NEW users
    const isNewUser = ctx.session.isNewUser;

    if (referralCode && userId && !isNewUser) {
      logger.info(`Existing user ${userId} used referral link, ignoring (not a new user)`);
    }

    if (referralCode && userId && isNewUser) {
      try {
        // Check if user already has a referrer (extra safety check)
        const currentUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { referredBy: true },
        });

        if (currentUser?.referredBy) {
          logger.info(`User ${userId} already has a referrer, skipping`);
        } else {
          // Find the direct referrer (Level 1)
          const level1Referrer = await prisma.user.findUnique({
            where: { referralCode },
            select: { id: true },
          });

          if (level1Referrer && level1Referrer.id !== userId) {
            // Save referrer relationship
            await prisma.user.update({
              where: { id: userId },
              data: { referredBy: level1Referrer.id },
            });

            logger.info(`User ${userId} referred by ${level1Referrer.id}`);

            // Award welcome bonus to new user (+5m)
            await referralRewardService.awardNewUserBonus(userId);

            // Update leaderboard for new user
            const updatedUser = await prisma.user.findUnique({
              where: { id: userId },
              select: { totalPoints: true }
            });
            if (updatedUser) {
              await leaderboardService.updateUserPosition(userId, updatedUser.totalPoints);
            }
          }
        }
      } catch (error) {
        logger.error('Referral processing error:', error);
      }
    }

    // Process daily visit streak
    if (userId) {
      try {
        await visitStreakService.processVisit(userId);

        // Always check referral rewards (user might have gained points elsewhere)
        await referralRewardService.checkAndAwardReferralRewards(userId, leaderboardService);
      } catch (error) {
        logger.error('Visit streak processing error:', error);
      }
    }

    // Welcome message
    const welcomeMessage = `🏔 *Призы участникам лидерборда каждый сезон*

Если ты холдер стикеров StickerPack или Goodies, то занимай свое место в лидерборде, выполняй задания и получай призы!

🎁 Кстати, первые участники и инфлюенсеры будут в выигрыше!

📩 По вопросам к @baron\\_creator
🛠 Техническое сопровождение: @namewasntdrown`;

    // Keyboard with two buttons
    // Note: Web App button requires HTTPS URL in production
    const keyboard = {
      inline_keyboard: [
        // Only show Web App button if URL is HTTPS (production)
        ...(config.miniApp.url.startsWith('https://')
          ? [[{ text: '🧊 open ICE', web_app: { url: config.miniApp.url } }]]
          : []
        ),
        [{ text: '👥 join community', url: config.community.url }],
      ],
    };

    // Try to send photo with message, fallback to text-only if photo fails
    const photoUrl = process.env.WELCOME_IMAGE_URL;

    if (photoUrl) {
      try {
        await ctx.replyWithPhoto(photoUrl, {
          caption: welcomeMessage,
          parse_mode: 'Markdown',
          reply_markup: keyboard,
        });
      } catch (photoError) {
        // Fallback to text-only message if photo fails
        logger.warn('Failed to send photo, sending text-only message');
        await ctx.reply(welcomeMessage, {
          parse_mode: 'Markdown',
          reply_markup: keyboard,
        });
      }
    } else {
      // No photo URL configured, send text-only
      await ctx.reply(welcomeMessage, {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      });
    }
  } catch (error) {
    logger.error('Start command error:', error);
    await ctx.reply('Something went wrong. Please try again later.');
  }
}
