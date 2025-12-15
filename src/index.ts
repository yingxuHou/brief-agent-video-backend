import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import rateLimit from 'express-rate-limit'
import morgan from 'morgan'
import { config } from 'dotenv'
import path from 'path'

// 导入配置
import { connectDB } from '@/config/database.js'
import { redisClient } from '@/config/redis.js'
import { logger } from '@/utils/logger.js'

// 导入中间件
import { errorHandler, notFoundHandler } from '@/middleware/errorHandler.js'

// 导入路由
import authRoutes from '@/routes/auth.js'
import briefRoutes from '@/routes/brief.js'

// 加载环境变量
config({ path: path.join(__dirname, '../../.env') })

const app = express()
const PORT = process.env.PORT || 3000

// 基础中间件
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false
}))

// CORS配置
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || 'http://localhost:5173',
  credentials: process.env.CORS_CREDENTIALS === 'true',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}))

// 压缩响应
app.use(compression())

// 请求解析
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// 请求日志
app.use(morgan('combined', {
  stream: {
    write: (message: string) => {
      logger.info(message.trim())
    }
  }
}))

// 速率限制
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15分钟
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // 限制每个IP 100次请求
  message: {
    success: false,
    message: '请求过于频繁，请稍后再试',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`)
    res.status(429).json({
      success: false,
      message: '请求过于频繁，请稍后再试',
      code: 'RATE_LIMIT_EXCEEDED'
    })
  }
})

app.use('/api', limiter)

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  })
})

// API路由
app.use('/api/auth', authRoutes)
app.use('/api/brief', briefRoutes)

// API信息路由
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'AI达人广告协创平台 API',
    version: '1.0.0',
    documentation: '/api/docs',
    endpoints: {
      auth: '/api/auth',
      brief: '/api/brief'
    }
  })
})

// 404处理
app.use(notFoundHandler)

// 全局错误处理
app.use(errorHandler)

/**
 * 启动服务器
 */
async function startServer(): Promise<void> {
  try {
    // 连接数据库
    await connectDB()
    logger.info('MongoDB connected successfully')

    // 连接Redis
    await redisClient.connect()
    logger.info('Redis connected successfully')

    // 启动服务器
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`)
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`)
      logger.info(`API Base URL: http://localhost:${PORT}/api`)
    })

    // 优雅关闭处理
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received. Shutting down gracefully...')

      await redisClient.disconnect()
      process.exit(0)
    })

    process.on('SIGINT', async () => {
      logger.info('SIGINT received. Shutting down gracefully...')

      await redisClient.disconnect()
      process.exit(0)
    })

  } catch (error) {
    logger.error('Failed to start server:', error)
    process.exit(1)
  }
}

// 未捕获异常处理
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

// 启动服务器
startServer()

export default app