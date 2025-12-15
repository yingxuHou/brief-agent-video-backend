import { Request, Response, NextFunction } from 'express'
import { verifyAccessToken, extractTokenFromHeader, JWTPayload } from '@/utils/auth.js'
import { User, IUser } from '@/models/User.js'
import { logger } from '@/utils/logger.js'

// 扩展Request接口以包含用户信息
declare global {
  namespace Express {
    interface Request {
      user?: IUser
      userId?: string
    }
  }
}

/**
 * JWT认证中间件
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization)

    if (!token) {
      res.status(401).json({
        success: false,
        message: '访问令牌缺失',
        code: 'TOKEN_MISSING'
      })
      return
    }

    // 验证token
    const decoded = verifyAccessToken(token)

    // 从数据库获取用户信息
    const user = await User.findById(decoded.userId).select('-password')

    if (!user) {
      res.status(401).json({
        success: false,
        message: '用户不存在',
        code: 'USER_NOT_FOUND'
      })
      return
    }

    if (!user.isActive) {
      res.status(401).json({
        success: false,
        message: '用户账户已被禁用',
        code: 'USER_INACTIVE'
      })
      return
    }

    // 将用户信息添加到请求对象
    req.user = user
    req.userId = user._id.toString()

    next()
  } catch (error) {
    logger.error('Authentication error:', error)

    let message = '认证失败'
    let code = 'AUTHENTICATION_FAILED'

    if (error instanceof Error) {
      if (error.message.includes('expired')) {
        message = '访问令牌已过期'
        code = 'TOKEN_EXPIRED'
      } else if (error.message.includes('Invalid')) {
        message = '无效的访问令牌'
        code = 'TOKEN_INVALID'
      }
    }

    res.status(401).json({
      success: false,
      message,
      code
    })
  }
}

/**
 * 可选认证中间件 - token存在则验证，不存在则继续
 */
export const optionalAuthenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization)

    if (!token) {
      // 没有token，继续执行
      next()
      return
    }

    const decoded = verifyAccessToken(token)
    const user = await User.findById(decoded.userId).select('-password')

    if (user && user.isActive) {
      req.user = user
      req.userId = user._id.toString()
    }

    next()
  } catch (error) {
    logger.error('Optional authentication error:', error)
    // 可选认证失败时不阻止请求继续
    next()
  }
}

/**
 * 角色授权中间件
 */
export const authorize = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: '用户未认证',
        code: 'USER_NOT_AUTHENTICATED'
      })
      return
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: '权限不足',
        code: 'INSUFFICIENT_PERMISSIONS',
        data: {
          requiredRoles: allowedRoles,
          userRole: req.user.role
        }
      })
      return
    }

    next()
  }
}

/**
 * 资源所有者授权中间件 - 确保用户只能访问自己的资源
 */
export const authorizeResourceOwner = (resourceUserIdField = 'userId') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: '用户未认证',
        code: 'USER_NOT_AUTHENTICATED'
      })
      return
    }

    // 管理员可以访问所有资源
    if (req.user.role === 'admin') {
      next()
      return
    }

    // 从请求参数或请求体中获取资源的用户ID
    const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField]

    if (!resourceUserId) {
      res.status(400).json({
        success: false,
        message: '无法确定资源所有者',
        code: 'RESOURCE_OWNER_UNKNOWN'
      })
      return
    }

    if (req.user._id.toString() !== resourceUserId.toString()) {
      res.status(403).json({
        success: false,
        message: '只能访问自己的资源',
        code: 'RESOURCE_ACCESS_DENIED'
      })
      return
    }

    next()
  }
}

/**
 * 订阅检查中间件
 */
export const checkSubscription = (...requiredPlans: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: '用户未认证',
        code: 'USER_NOT_AUTHENTICATED'
      })
      return
    }

    const userPlan = req.user.subscription?.plan || 'free'

    if (!requiredPlans.includes(userPlan)) {
      res.status(403).json({
        success: false,
        message: '当前订阅计划不支持此功能',
        code: 'SUBSCRIPTION_LIMITED',
        data: {
          currentPlan: userPlan,
          requiredPlans: requiredPlans
        }
      })
      return
    }

    // 检查订阅是否有效
    if (req.user.subscription?.status !== 'active') {
      res.status(403).json({
        success: false,
        message: '订阅已过期或已取消',
        code: 'SUBSCRIPTION_INACTIVE'
      })
      return
    }

    next()
  }
}