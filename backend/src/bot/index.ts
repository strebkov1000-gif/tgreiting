import { Bot, session, Context } from 'grammy';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { registerCommands } from './commands/index.js';
import { registerHandlers } from './handlers/index.js';
import { authMiddleware } from './middleware/auth.js';
import { loggingMiddleware } from './middleware/logging.js';

export interface BotContext extends Context {
  session: {
    userId?: string;
    username?: string;
  };
}

class TelegramBot {
  private bot: Bot<BotContext>;

  constructor() {
    this.bot = new Bot<BotContext>(config.bot.token);
    this.setupMiddleware();
    this.setupHandlers();
  }

  private setupMiddleware() {
    // Session middleware
    this.bot.use(session({
      initial: () => ({}),
    }));

    // Logging middleware
    this.bot.use(loggingMiddleware);

    // Auth middleware
    this.bot.use(authMiddleware);
  }

  private setupHandlers() {
    // Register commands
    registerCommands(this.bot);

    // Register message/callback handlers
    registerHandlers(this.bot);

    // Error handling
    this.bot.catch((err) => {
      logger.error('Bot error:', err);
    });
  }

  async start() {
    try {
      // Set bot commands for menu
      await this.bot.api.setMyCommands([
        { command: 'start', description: 'Start the bot and open Mini App' },
        { command: 'leaderboard', description: 'View leaderboard' },
        { command: 'profile', description: 'View your profile' },
        { command: 'rank', description: 'Check your rank' },
        { command: 'help', description: 'Get help' },
      ]);

      // Start bot
      await this.bot.start({
        onStart: (botInfo) => {
          logger.info(`Bot @${botInfo.username} started`);
        },
      });
    } catch (error) {
      logger.error('Failed to start bot:', error);
      throw error;
    }
  }

  async stop() {
    await this.bot.stop();
    logger.info('Bot stopped');
  }

  getBot(): Bot<BotContext> {
    return this.bot;
  }
}

export const telegramBot = new TelegramBot();
