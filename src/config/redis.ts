import Redis from 'ioredis';
import { config } from './index';
import { logger } from '../utils/logger';

export let redisClient: Redis | null = null;

export const initializeRedis = async (): Promise<Redis> => {
  try {
    redisClient = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password || undefined,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    redisClient.on('connect', () => {
      logger.info('✅ Redis connected');
    });

    redisClient.on('error', (error) => {
      logger.error('❌ Redis error:', error);
    });

    redisClient.on('close', () => {
      logger.warn('⚠️ Redis connection closed');
    });

    // Test connection
    await redisClient.ping();
    
    return redisClient;
  } catch (error) {
    logger.error('❌ Failed to connect to Redis:', error);
    throw error;
  }
};

// Cache helper functions
export const cacheService = {
  // Get cached value
  async get<T>(key: string): Promise<T | null> {
    if (!redisClient) return null;
    const value = await redisClient.get(key);
    return value ? JSON.parse(value) : null;
  },

  // Set cached value with TTL (in seconds)
  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    if (!redisClient) return;
    const stringValue = JSON.stringify(value);
    if (ttlSeconds) {
      await redisClient.setex(key, ttlSeconds, stringValue);
    } else {
      await redisClient.set(key, stringValue);
    }
  },

  // Delete cached value
  async del(key: string): Promise<void> {
    if (!redisClient) return;
    await redisClient.del(key);
  },

  // Delete multiple keys by pattern
  async delPattern(pattern: string): Promise<void> {
    if (!redisClient) return;
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
  },

  // Check if key exists
  async exists(key: string): Promise<boolean> {
    if (!redisClient) return false;
    const result = await redisClient.exists(key);
    return result === 1;
  },

  // Increment value
  async incr(key: string): Promise<number> {
    if (!redisClient) return 0;
    return redisClient.incr(key);
  },

  // Set hash
  async hset(key: string, field: string, value: any): Promise<void> {
    if (!redisClient) return;
    await redisClient.hset(key, field, JSON.stringify(value));
  },

  // Get hash
  async hget<T>(key: string, field: string): Promise<T | null> {
    if (!redisClient) return null;
    const value = await redisClient.hget(key, field);
    return value ? JSON.parse(value) : null;
  },

  // Get all hash fields
  async hgetall<T>(key: string): Promise<Record<string, T> | null> {
    if (!redisClient) return null;
    const data = await redisClient.hgetall(key);
    if (!data || Object.keys(data).length === 0) return null;
    
    const result: Record<string, T> = {};
    for (const [field, value] of Object.entries(data)) {
      result[field] = JSON.parse(value);
    }
    return result;
  },

  // Add to sorted set (for leaderboards)
  async zadd(key: string, score: number, member: string): Promise<void> {
    if (!redisClient) return;
    await redisClient.zadd(key, score, member);
  },

  // Get sorted set range (for leaderboards)
  async zrevrange(key: string, start: number, stop: number): Promise<string[]> {
    if (!redisClient) return [];
    return redisClient.zrevrange(key, start, stop);
  },

  // Get sorted set with scores
  async zrevrangeWithScores(
    key: string,
    start: number,
    stop: number
  ): Promise<{ member: string; score: number }[]> {
    if (!redisClient) return [];
    const result = await redisClient.zrevrange(key, start, stop, 'WITHSCORES');
    const items: { member: string; score: number }[] = [];
    for (let i = 0; i < result.length; i += 2) {
      items.push({
        member: result[i],
        score: parseFloat(result[i + 1]),
      });
    }
    return items;
  },

  // Set expiry on key
  async expire(key: string, seconds: number): Promise<void> {
    if (!redisClient) return;
    await redisClient.expire(key, seconds);
  },

  // Get TTL
  async ttl(key: string): Promise<number> {
    if (!redisClient) return -1;
    return redisClient.ttl(key);
  },
};

export default { initializeRedis, redisClient, cacheService };
