import { CommandContext } from 'grammy';
import { BotContext } from '../index.js';
import { config } from '../../config/index.js';
import { prisma } from '../../database/prisma/client.js';
import { redis } from '../../database/redis/client.js';
import { LeaderboardService } from '../../services/leaderboard/LeaderboardService.js';
import { VisitStreakService } from '../../services/streak/VisitStreakService.js';
import { logger } from '../../utils/logger.js';

const leaderboardService = new LeaderboardService(prisma, redis);
const visitStreakService = new VisitStreakService(prisma);

export async function startCommand(ctx: CommandContext<BotContext>) {
  try {
    const userId = ctx.session.userId;
    const firstName = ctx.from?.first_name || 'User';

    // Check if there's a referral code in the command
    const args = ctx.match;
    const referralCode = args && typeof args === 'string' ? args.trim() : null;

    // Handle referral with multi-level rewards
    // Level 1 (direct): 100 points
    // Level 2 (referrer of referrer): 25 points
    // Level 3 (referrer of referrer of referrer): 10 points
    // IMPORTANT: Only process referrals for NEW users to prevent existing users from being counted
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
            select: {
              id: true,
              telegramId: true,
              referredBy: true,
            },
          });

          if (level1Referrer && level1Referrer.id !== userId) {
            // Update user with referrer
            await prisma.user.update({
              where: { id: userId },
              data: { referredBy: level1Referrer.id },
            });

            // Award Level 1: 100 points to direct referrer
            await prisma.pointTransaction.create({
              data: {
                userId: level1Referrer.id,
                points: 100,
                activityType: 'referral',
                description: `Invited ${firstName} (Level 1)`,
              },
            });
            const updatedL1 = await prisma.user.update({
              where: { id: level1Referrer.id },
              data: { totalPoints: { increment: 100 } },
            });
            await leaderboardService.updateUserPosition(level1Referrer.id, updatedL1.totalPoints);
            logger.info(`Referral L1: ${level1Referrer.id} gets 100 points for inviting ${userId}`);

            // Check for Level 2 referrer
            if (level1Referrer.referredBy) {
              const level2Referrer = await prisma.user.findUnique({
                where: { id: level1Referrer.referredBy },
                select: { id: true, referredBy: true },
              });

              if (level2Referrer) {
                // Award Level 2: 25 points
                await prisma.pointTransaction.create({
                  data: {
                    userId: level2Referrer.id,
                    points: 25,
                    activityType: 'referral_l2',
                    description: `Referral chain bonus (Level 2)`,
                  },
                });
                const updatedL2 = await prisma.user.update({
                  where: { id: level2Referrer.id },
                  data: { totalPoints: { increment: 25 } },
                });
                await leaderboardService.updateUserPosition(level2Referrer.id, updatedL2.totalPoints);
                logger.info(`Referral L2: ${level2Referrer.id} gets 25 points`);

                // Check for Level 3 referrer
                if (level2Referrer.referredBy) {
                  const level3Referrer = await prisma.user.findUnique({
                    where: { id: level2Referrer.referredBy },
                    select: { id: true },
                  });

                  if (level3Referrer) {
                    // Award Level 3: 10 points
                    await prisma.pointTransaction.create({
                      data: {
                        userId: level3Referrer.id,
                        points: 10,
                        activityType: 'referral_l3',
                        description: `Referral chain bonus (Level 3)`,
                      },
                    });
                    const updatedL3 = await prisma.user.update({
                      where: { id: level3Referrer.id },
                      data: { totalPoints: { increment: 10 } },
                    });
                    await leaderboardService.updateUserPosition(level3Referrer.id, updatedL3.totalPoints);
                    logger.info(`Referral L3: ${level3Referrer.id} gets 10 points`);
                  }
                }
              }
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
      } catch (error) {
        logger.error('Visit streak processing error:', error);
      }
    }

    // Welcome message
    const welcomeMessage = `тут будет крутой текст для приветсвия`;

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
