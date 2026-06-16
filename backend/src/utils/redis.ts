import redisConfig from '../config/redis';
import logger from './logger';

/**
 * Initialize Redis connection via the central manager
 */
export const connectRedis = async (): Promise<void> => {
  try {
    await redisConfig.initialize();
  } catch (err) {
    logger.error(`Failed to connect to Redis, permissions will not be cached: ${err}`);
  }
};

/**
 * Cache user permissions in Redis with 1-hour expiry
 */
export const cachePermissions = async (userId: string, permissions: string[]): Promise<void> => {
  try {
    const client = redisConfig.getRawClient();
    if (!client) {
      logger.warn(`Skipping permission caching for user ${userId}: Redis not available`);
      return;
    }
    
    await client.set(`user_perms:${userId}`, JSON.stringify(permissions), 'EX', 3600);
  } catch (err) {
    logger.error(`Error caching permissions for user ${userId}: ${err}`);
  }
};

/**
 * Retrieve cached user permissions from Redis
 */
export const getCachedPermissions = async (userId: string): Promise<string[] | null> => {
  try {
    const client = redisConfig.getRawClient();
    if (!client) return null;

    const data = await client.get(`user_perms:${userId}`);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    logger.error(`Error retrieving cached permissions for user ${userId}: ${err}`);
    return null;
  }
};

/**
 * Clear cached user permissions
 */
export const clearCachedPermissions = async (userId: string): Promise<void> => {
  try {
    const client = redisConfig.getRawClient();
    if (!client) return;

    await client.del(`user_perms:${userId}`);
  } catch (err) {
    logger.error(`Error clearing cached permissions for user ${userId}: ${err}`);
  }
};
