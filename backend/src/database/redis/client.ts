import Redis from 'ioredis';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

class RedisClient {
  private client: Redis;

  constructor() {
    this.client = new Redis(config.redis.url, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
    });

    this.client.on('connect', () => {
      logger.info('Redis connected');
    });

    this.client.on('error', (err) => {
      logger.error('Redis error:', err);
    });

    this.client.on('close', () => {
      logger.warn('Redis connection closed');
    });
  }

  async connect() {
    try {
      await this.client.connect();
      logger.info('Redis client initialized');
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  getClient(): Redis {
    return this.client;
  }

  async disconnect() {
    await this.client.quit();
    logger.info('Redis disconnected');
  }

  // Leaderboard operations (using Sorted Sets)
  async updateLeaderboard(userId: string, score: number): Promise<void> {
    await this.client.zadd('leaderboard', score, userId);
  }

  async getLeaderboard(start: number, end: number): Promise<Array<{ userId: string; score: number }>> {
    const results = await this.client.zrevrange('leaderboard', start, end, 'WITHSCORES');
    const leaderboard: Array<{ userId: string; score: number }> = [];

    for (let i = 0; i < results.length; i += 2) {
      leaderboard.push({
        userId: results[i],
        score: parseFloat(results[i + 1]),
      });
    }

    return leaderboard;
  }

  async getUserRank(userId: string): Promise<number | null> {
    const rank = await this.client.zrevrank('leaderboard', userId);
    return rank !== null ? rank + 1 : null; // Convert to 1-indexed
  }

  async getUserScore(userId: string): Promise<number | null> {
    const score = await this.client.zscore('leaderboard', userId);
    return score !== null ? parseFloat(score) : null;
  }

  // Cache operations
  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.client.setex(key, ttl, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  // Session operations
  async setSession(sessionId: string, data: any, ttl: number = 3600): Promise<void> {
    await this.client.setex(`session:${sessionId}`, ttl, JSON.stringify(data));
  }

  async getSession(sessionId: string): Promise<any | null> {
    const data = await this.client.get(`session:${sessionId}`);
    return data ? JSON.parse(data) : null;
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.client.del(`session:${sessionId}`);
  }

  // Hash operations (for caching user data)
  async hset(key: string, field: string, value: string): Promise<void> {
    await this.client.hset(key, field, value);
  }

  async hget(key: string, field: string): Promise<string | null> {
    return await this.client.hget(key, field);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return await this.client.hgetall(key);
  }
}

export { RedisClient };
export const redis = new RedisClient();
