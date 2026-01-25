import { CommandContext } from 'grammy';
import { BotContext } from '../index.js';
import { redis } from '../../database/redis/client.js';
import { prisma } from '../../database/prisma/client.js';
import { logger } from '../../utils/logger.js';

export async function rankCommand(ctx: CommandContext<BotContext>) {
  try {
    const userId = ctx.session.userId;

    if (!userId) {
      await ctx.reply('Please use /start first to register.');
      return;
    }

    // Get user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        totalPoints: true,
        nftCount: true,
        currentStreak: true,
      },
    });

    if (!user) {
      await ctx.reply('User not found. Please use /start to register.');
      return;
    }

    // Get rank from Redis
    const rank = await redis.getUserRank(userId);

    if (rank === null) {
      await ctx.reply('You are not ranked yet. Connect your wallet and get some NFTs to start earning points!');
      return;
    }

    const rankMessage = `📊 *Your Stats*\n\n` +
      `🏆 Rank: #${rank}\n` +
      `⭐ Points: ${user.totalPoints.toLocaleString()}\n` +
      `🎨 NFTs: ${user.nftCount}\n` +
      `🔥 Streak: ${user.currentStreak} days\n\n` +
      `Keep collecting NFTs and stay active to climb the leaderboard!`;

    await ctx.reply(rankMessage, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🏆 View Full Leaderboard', callback_data: 'view_leaderboard' }],
          [{ text: '👤 View Profile', web_app: { url: `${process.env.MINI_APP_URL}/profile` } }],
        ],
      },
    });
  } catch (error) {
    logger.error('Rank command error:', error);
    await ctx.reply('Failed to fetch your rank. Please try again later.');
  }
}
