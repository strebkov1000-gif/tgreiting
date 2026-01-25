import { Bot } from 'grammy';
import { BotContext } from '../index.js';
import { logger } from '../../utils/logger.js';

export function registerHandlers(bot: Bot<BotContext>) {
  // Callback query handlers
  bot.callbackQuery('view_leaderboard', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply('Opening leaderboard...', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🏆 View Leaderboard', web_app: { url: `${process.env.MINI_APP_URL}/leaderboard` } }],
        ],
      },
    });
  });

  bot.callbackQuery('help', async (ctx) => {
    await ctx.answerCallbackQuery();
    await bot.handleUpdate(ctx.update);
  });

  // Message handlers
  bot.on('message:text', async (ctx) => {
    const text = ctx.message.text.toLowerCase();

    if (text.includes('leaderboard') || text.includes('рейтинг')) {
      await ctx.reply('Opening leaderboard...', {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🏆 View Leaderboard', web_app: { url: `${process.env.MINI_APP_URL}/leaderboard` } }],
          ],
        },
      });
    } else {
      await ctx.reply('Use /help to see available commands or tap the button to open the app.', {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🚀 Open Mini App', web_app: { url: process.env.MINI_APP_URL || '' } }],
          ],
        },
      });
    }
  });

  // Chat member updates (for tracking when bot is added to groups)
  bot.on('my_chat_member', async (ctx) => {
    const { chat, new_chat_member } = ctx.myChatMember;

    if (new_chat_member.status === 'member' || new_chat_member.status === 'administrator') {
      logger.info(`Bot added to chat: ${chat.id} (${chat.title || 'Unknown'})`);

      // Store chat info
      // This will be implemented with Chat service later
    } else if (new_chat_member.status === 'left' || new_chat_member.status === 'kicked') {
      logger.info(`Bot removed from chat: ${chat.id}`);
    }
  });
}
