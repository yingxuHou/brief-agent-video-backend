import { Request, Response, NextFunction } from 'express'
import { logger } from '@/utils/logger.js'

export interface ApiError extends Error {
  statusCode?: number
  code?: string
  isOperational?: boolean
}

export class AppError extends Error implements ApiError {
  public statusCode: number
  public code: string
  public isOperational: boolean

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR') {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.isOperational = true

    Error.captureStackTrace(this, this.constructor)
  }
}

/**
 * 全局错误处理中间件
 */
export const errorHandler = (
  error: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let { statusCode = 500, message, code = 'INTERNAL_ERROR' } = error

  // 记录错误日志
  logger.error('API Error:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    statusCode,
    code
  })

  // MongoDB错误处理
  if (error.name === 'ValidationError') {
    statusCode = 400
    code = 'VALIDATION_ERROR'
    message = '数据验证失败'
    const errors = Object.values((error as any).errors).map((err: any) => err.message)
    message = errors.join(', ')
  }

  // MongoDB重复键错误
  if (error.name === 'MongoServerError' && (error as any).code === 11000) {
    statusCode = 400
    code = 'DUPLICATE_ERROR'
    const field = Object.keys((error as any).keyValue)[0]
    message = `${field}已存在`
  }

  // JWT错误处理
  if (error.name === 'JsonWebTokenError') {
    statusCode = 401
    code = 'TOKEN_INVALID'
    message = '无效的访问令牌'
  }

  if (error.name === 'TokenExpiredError') {
    statusCode = 401
    code = 'TOKEN_EXPIRED'
    message = '访问令牌已过期'
  }

  // 开发环境返回详细错误信息
  const errorResponse: any = {
    success: false,
    message,
    code
  }

  // 开发环境返回堆栈信息
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = error.stack
    errorResponse.details = error
  }

  res.status(statusCode).json(errorResponse)
}

/**
 * 404处理中间件
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = new AppError(
    `未找到路由 ${req.method} ${req.originalUrl}`,
    404,
    'ROUTE_NOT_FOUND'
  )
  next(error)
}

/**
 * 异步错误捕获包装器
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}