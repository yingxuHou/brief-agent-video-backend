import mongoose from 'mongoose'
import { logger } from '@/utils/logger.js'

// MongoDB连接配置
const connectDB = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI

    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not defined')
    }

    const options = {
      maxPoolSize: 10, // 连接池最大连接数
      serverSelectionTimeoutMS: 5000, // 服务器选择超时时间
      socketTimeoutMS: 45000, // Socket超时时间
      bufferMaxEntries: 0, // 禁用mongoose缓冲
      bufferCommands: false, // 禁用mongoose缓冲命令
    }

    const conn = await mongoose.connect(mongoUri, options)

    logger.info(`MongoDB connected: ${conn.connection.host}`)

    // 监听连接事件
    mongoose.connection.on('error', (error) => {
      logger.error('MongoDB connection error:', error)
    })

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected')
    })

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected')
    })

    // 优雅关闭
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close()
        logger.info('MongoDB connection closed through app termination')
        process.exit(0)
      } catch (error) {
        logger.error('Error closing MongoDB connection:', error)
        process.exit(1)
      }
    })

  } catch (error) {
    logger.error('Error connecting to MongoDB:', error)
    process.exit(1)
  }
}

export { connectDB }