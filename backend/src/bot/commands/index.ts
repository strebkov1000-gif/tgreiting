import { Bot } from 'grammy';
import { BotContext } from '../index.js';
import { startCommand } from './start.js';
import { helpCommand } from './help.js';
import { rankCommand } from './rank.js';

export function registerCommands(bot: Bot<BotContext>) {
  bot.command('start', startCommand);
  bot.command('help', helpCommand);
  bot.command('rank', rankCommand);
  bot.command('leaderboard', async (ctx) => {
    await ctx.reply('Opening leaderboard...', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🏆 View Leaderboard', web_app: { url: `${process.env.MINI_APP_URL}/leaderboard` } }],
        ],
      },
    });
  });
  bot.command('profile', async (ctx) => {
    await ctx.reply('Opening your profile...', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '👤 View Profile', web_app: { url: `${process.env.MINI_APP_URL}/profile` } }],
        ],
      },
    });
  });
}
