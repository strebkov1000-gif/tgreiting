import { CommandContext } from 'grammy';
import { BotContext } from '../index.js';

export async function helpCommand(ctx: CommandContext<BotContext>) {
  const helpMessage = `❓ *Ice Rating Bot - Help*\n\n` +
    `*Available Commands:*\n` +
    `/start - Start the bot and open Mini App\n` +
    `/leaderboard - View the leaderboard\n` +
    `/profile - View your profile\n` +
    `/rank - Check your current rank\n` +
    `/help - Show this help message\n\n` +
    `*How to earn points:*\n` +
    `🎨 Own NFT stickers from whitelisted collections\n` +
    `🔥 Daily check-ins and maintain streaks\n` +
    `👥 Invite friends with your referral link\n` +
    `🏆 Unlock achievements\n` +
    `💬 Join IceGang chat for bonus multiplier\n\n` +
    `*Need more help?*\n` +
    `Open the Mini App for detailed info!`;

  await ctx.reply(helpMessage, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '🚀 Open Mini App', web_app: { url: process.env.MINI_APP_URL || '' } }],
      ],
    },
  });
}
