import { config, validateConfig } from './config/index.js';
import { logger } from './utils/logger.js';
import { connectDatabase, disconnectDatabase } from './database/prisma/client.js';
import { redis } from './database/redis/client.js';
import { telegramBot } from './bot/index.js';
import { startApiServer } from './api/index.js';

async function main() {
  try {
    logger.info('Starting Ice Rating Bot...');

    // Validate configuration
    validateConfig();
    logger.info('Configuration validated');

    // Connect to database
    await connectDatabase();

    // Connect to Redis
    await redis.connect();

    // Start API server
    await startApiServer();

    // Start Telegram bot
    await telegramBot.start();

    logger.info('🚀 Ice Rating Bot is running!');
  } catch (error) {
    logger.error('Fatal error during startup:', error);
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown() {
  logger.info('Shutting down...');

  try {
    await telegramBot.stop();
    await disconnectDatabase();
    await redis.disconnect();
    logger.info('Shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  shutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at:', promise, 'reason:', reason);
  shutdown();
});

// Start the application
main();
