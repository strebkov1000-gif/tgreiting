import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Telegram Bot
  bot: {
    token: process.env.BOT_TOKEN || '',
    username: process.env.BOT_USERNAME || '',
  },

  // Mini App
  miniApp: {
    url: process.env.MINI_APP_URL || 'http://localhost:5173',
  },

  // Community
  community: {
    url: process.env.COMMUNITY_URL || 'https://t.me/your_community_channel',
  },

  // Database
  database: {
    url: process.env.DATABASE_URL || '',
  },

  // Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  // TON Blockchain
  ton: {
    apiKey: process.env.TON_API_KEY || '',
    network: process.env.TON_NETWORK || 'testnet',
    centerApiKey: process.env.TON_CENTER_API_KEY || '',
  },

  // API
  api: {
    port: parseInt(process.env.API_PORT || '3000'),
    url: process.env.API_URL || 'http://localhost:3000',
  },

  // Security
  security: {
    jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    sessionSecret: process.env.SESSION_SECRET || 'session-secret-change-in-production',
  },

  // Environment
  env: process.env.NODE_ENV || 'development',
  isDev: process.env.NODE_ENV !== 'production',
  isProd: process.env.NODE_ENV === 'production',

  // NFT Collections
  nft: {
    whitelistedCollections: (process.env.WHITELISTED_COLLECTIONS || '').split(',').filter(Boolean),
  },

  // IceGang Chat
  icegang: {
    chatId: process.env.ICEGANG_CHAT_ID ? BigInt(process.env.ICEGANG_CHAT_ID) : BigInt(0),
    boostMultiplier: parseFloat(process.env.ICEGANG_BOOST_MULTIPLIER || '1.2'),
  },

  // Jobs
  jobs: {
    nftScanIntervalHours: parseInt(process.env.NFT_SCAN_INTERVAL_HOURS || '6'),
    leaderboardUpdateIntervalMinutes: parseInt(process.env.LEADERBOARD_UPDATE_INTERVAL_MINUTES || '5'),
  },

  // Feature Flags
  features: {
    leaderboard: {
      mountainEnabled: process.env.LEADERBOARD_MOUNTAIN_ENABLED === 'true',
      metric: process.env.LEADERBOARD_METRIC || 'meters', // 'points' | 'meters'
      podiumSize: parseInt(process.env.LEADERBOARD_PODIUM_SIZE || '5'),
      defaultPageSize: parseInt(process.env.LEADERBOARD_PAGE_SIZE || '20'),
    },
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};

// Validation
export function validateConfig() {
  const required = {
    'BOT_TOKEN': config.bot.token,
    'DATABASE_URL': config.database.url,
  };

  const missing = Object.entries(required)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
