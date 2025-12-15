import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { IUser } from '@/models/User.js'
import { logger } from './logger.js'

// JWT配置
const JWT_SECRET = process.env.JWT_SECRET!
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d'
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!
const JWT_REFRESH_EXPIRE = process.env.JWT_REFRESH_EXPIRE || '30d'
const BCRYPT_SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12')

export interface JWTPayload {
  userId: string
  email: string
  role: string
  type: 'access' | 'refresh'
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
}

/**
 * 密码哈希
 */
export const hashPassword = async (password: string): Promise<string> => {
  try {
    const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS)
    return await bcrypt.hash(password, salt)
  } catch (error) {
    logger.error('Error hashing password:', error)
    throw new Error('Failed to hash password')
  }
}

/**
 * 密码验证
 */
export const comparePassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  try {
    return await bcrypt.compare(password, hashedPassword)
  } catch (error) {
    logger.error('Error comparing passwords:', error)
    throw new Error('Failed to compare passwords')
  }
}

/**
 * 生成访问令牌
 */
export const generateAccessToken = (user: IUser): string => {
  const payload: Omit<JWTPayload, 'type'> = {
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
  }

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRE,
    issuer: 'brief-agent-platform',
    audience: 'brief-agent-users',
  })
}

/**
 * 生成刷新令牌
 */
export const generateRefreshToken = (user: IUser): string => {
  const payload: Omit<JWTPayload, 'type'> = {
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
  }

  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRE,
    issuer: 'brief-agent-platform',
    audience: 'brief-agent-users',
  })
}

/**
 * 生成令牌对
 */
export const generateTokenPair = (user: IUser): TokenPair => {
  return {
    accessToken: generateAccessToken(user),
    refreshToken: generateRefreshToken(user),
  }
}

/**
 * 验证访问令牌
 */
export const verifyAccessToken = (token: string): JWTPayload => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'brief-agent-platform',
      audience: 'brief-agent-users',
    }) as Omit<JWTPayload, 'type'>

    return {
      ...decoded,
      type: 'access'
    }
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Access token expired')
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid access token')
    } else {
      logger.error('Error verifying access token:', error)
      throw new Error('Failed to verify access token')
    }
  }
}

/**
 * 验证刷新令牌
 */
export const verifyRefreshToken = (token: string): JWTPayload => {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
      issuer: 'brief-agent-platform',
      audience: 'brief-agent-users',
    }) as Omit<JWTPayload, 'type'>

    return {
      ...decoded,
      type: 'refresh'
    }
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Refresh token expired')
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid refresh token')
    } else {
      logger.error('Error verifying refresh token:', error)
      throw new Error('Failed to verify refresh token')
    }
  }
}

/**
 * 从Authorization头中提取token
 */
export const extractTokenFromHeader = (authHeader: string | undefined): string | null => {
  if (!authHeader) {
    return null
  }

  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null
  }

  return parts[1]
}

/**
 * 生成随机密码重置令牌
 */
export const generateResetToken = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

/**
 * 验证密码强度
 */
export const validatePasswordStrength = (password: string): { isValid: boolean; message: string } => {
  if (password.length < 6) {
    return { isValid: false, message: '密码长度至少为6位' }
  }

  if (password.length > 128) {
    return { isValid: false, message: '密码长度不能超过128位' }
  }

  // 检查是否包含至少一个字母和一个数字
  const hasLetter = /[a-zA-Z]/.test(password)
  const hasNumber = /\d/.test(password)

  if (!hasLetter || !hasNumber) {
    return { isValid: false, message: '密码必须包含字母和数字' }
  }

  return { isValid: true, message: '密码强度验证通过' }
}