import { createClient, RedisClientType } from 'redis'
import { logger } from '@/utils/logger.js'

class RedisClient {
  private client: RedisClientType | null = null
  private isConnected: boolean = false

  async connect(): Promise<void> {
    try {
      this.client = createClient({
        socket: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
        },
        password: process.env.REDIS_PASSWORD || undefined,
      })

      this.client.on('error', (error) => {
        logger.error('Redis Client Error:', error)
        this.isConnected = false
      })

      this.client.on('connect', () => {
        logger.info('Redis Client Connected')
        this.isConnected = true
      })

      this.client.on('reconnecting', () => {
        logger.info('Redis Client Reconnecting')
      })

      this.client.on('ready', () => {
        logger.info('Redis Client Ready')
        this.isConnected = true
      })

      await this.client.connect()
    } catch (error) {
      logger.error('Failed to connect to Redis:', error)
      throw error
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.client) {
        await this.client.disconnect()
        this.isConnected = false
        logger.info('Redis Client Disconnected')
      }
    } catch (error) {
      logger.error('Error disconnecting Redis:', error)
      throw error
    }
  }

  isClientConnected(): boolean {
    return this.isConnected
  }

  getClient(): RedisClientType {
    if (!this.client) {
      throw new Error('Redis client not initialized')
    }
    return this.client
  }

  // 便捷方法
  async get(key: string): Promise<string | null> {
    try {
      return await this.getClient().get(key)
    } catch (error) {
      logger.error(`Redis GET error for key ${key}:`, error)
      return null
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    try {
      if (ttl) {
        await this.getClient().setEx(key, ttl, value)
      } else {
        await this.getClient().set(key, value)
      }
    } catch (error) {
      logger.error(`Redis SET error for key ${key}:`, error)
      throw error
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.getClient().del(key)
    } catch (error) {
      logger.error(`Redis DEL error for key ${key}:`, error)
      throw error
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.getClient().exists(key)
      return result === 1
    } catch (error) {
      logger.error(`Redis EXISTS error for key ${key}:`, error)
      return false
    }
  }
}

// 单例模式
export const redisClient = new RedisClient()