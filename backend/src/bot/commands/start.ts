import { CommandContext } from 'grammy';
import { BotContext } from '../index.js';
import { config } from '../../config/index.js';
import { prisma } from '../../database/prisma/client.js';
import { logger } from '../../utils/logger.js';

export async function startCommand(ctx: CommandContext<BotContext>) {
  try {
    const userId = ctx.session.userId;
    const firstName = ctx.from?.first_name || 'User';

    // Check if there's a referral code in the command
    const args = ctx.match;
    const referralCode = args && typeof args === 'string' ? args.trim() : null;

    // Handle referral
    if (referralCode && userId) {
      try {
        const referrer = await prisma.user.findUnique({
          where: { referralCode },
        });

        if (referrer && referrer.id !== userId) {
          // Update user with referrer
          await prisma.user.update({
            where: { id: userId },
            data: { referredBy: referrer.id },
          });

          // Award referral points
          await prisma.pointTransaction.create({
            data: {
              userId: referrer.id,
              points: 50,
              activityType: 'referral',
              description: `Invited ${firstName}`,
            },
          });

          // Update referrer's total points
          await prisma.user.update({
            where: { id: referrer.id },
            data: {
              totalPoints: {
                increment: 50,
              },
            },
          });

          logger.info(`Referral: ${userId} was referred by ${referrer.id}`);
        }
      } catch (error) {
        logger.error('Referral processing error:', error);
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
