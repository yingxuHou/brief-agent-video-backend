import { User, IUser } from '@/models/User.js'
import { generateTokenPair, hashPassword, comparePassword, generateResetToken } from '@/utils/auth.js'
import { redisClient } from '@/config/redis.js'
import { logger } from '@/utils/logger.js'
import mongoose from 'mongoose'

export interface RegisterData {
  username: string
  email: string
  password: string
  role: 'brand' | 'creator'
  firstName: string
  lastName: string
  company?: string
  jobTitle?: string
}

export interface LoginData {
  email: string
  password: string
}

export interface AuthResponse {
  user: Omit<IUser, 'password'>
  tokens: {
    accessToken: string
    refreshToken: string
  }
}

export class AuthService {
  /**
   * 用户注册
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      // 检查用户名是否已存在
      const existingUsername = await User.findOne({ username: data.username })
      if (existingUsername) {
        throw new Error('用户名已存在')
      }

      // 检查邮箱是否已存在
      const existingEmail = await User.findOne({ email: data.email.toLowerCase() })
      if (existingEmail) {
        throw new Error('邮箱已被注册')
      }

      // 哈希密码
      const hashedPassword = await hashPassword(data.password)

      // 创建用户
      const user = new User({
        username: data.username,
        email: data.email.toLowerCase(),
        password: hashedPassword,
        role: data.role,
        profile: {
          firstName: data.firstName,
          lastName: data.lastName,
          company: data.company,
          jobTitle: data.jobTitle,
        },
      })

      await user.save()

      // 生成tokens
      const tokens = generateTokenPair(user)

      // 存储refresh token到Redis
      await redisClient.set(
        `refresh_token:${user._id}`,
        tokens.refreshToken,
        30 * 24 * 60 * 60 // 30天
      )

      // 记录日志
      logger.info(`New user registered: ${user.email} (${user.role})`)

      // 返回用户信息（不包含密码）
      const userResponse = user.toJSON()
      delete (userResponse as any).password

      return {
        user: userResponse,
        tokens
      }
    } catch (error) {
      logger.error('Registration error:', error)
      throw error
    }
  }

  /**
   * 用户登录
   */
  async login(data: LoginData): Promise<AuthResponse> {
    try {
      // 查找用户
      const user = await User.findByEmail(data.email.toLowerCase())
      if (!user) {
        throw new Error('邮箱或密码错误')
      }

      // 检查账户状态
      if (!user.isActive) {
        throw new Error('账户已被禁用')
      }

      // 验证密码
      const isPasswordValid = await comparePassword(data.password, user.password!)
      if (!isPasswordValid) {
        throw new Error('邮箱或密码错误')
      }

      // 生成tokens
      const tokens = generateTokenPair(user)

      // 存储refresh token到Redis
      await redisClient.set(
        `refresh_token:${user._id}`,
        tokens.refreshToken,
        30 * 24 * 60 * 60 // 30天
      )

      // 更新最后登录时间
      user.lastLoginAt = new Date()
      await user.save()

      // 记录日志
      logger.info(`User logged in: ${user.email}`)

      // 返回用户信息（不包含密码）
      const userResponse = user.toJSON()
      delete (userResponse as any).password

      return {
        user: userResponse,
        tokens
      }
    } catch (error) {
      logger.error('Login error:', error)
      throw error
    }
  }

  /**
   * 刷新token
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      // 这里需要验证refresh token，简化实现
      // 实际应该解析JWT并验证有效性

      // 查找对应的用户
      // 简化版本 - 实际应该从token中解析用户ID

      throw new Error('功能待实现')
    } catch (error) {
      logger.error('Token refresh error:', error)
      throw error
    }
  }

  /**
   * 用户登出
   */
  async logout(userId: string): Promise<void> {
    try {
      // 从Redis中删除refresh token
      await redisClient.del(`refresh_token:${userId}`)

      logger.info(`User logged out: ${userId}`)
    } catch (error) {
      logger.error('Logout error:', error)
      throw error
    }
  }

  /**
   * 修改密码
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    try {
      // 获取用户
      const user = await User.findById(userId).select('+password')
      if (!user) {
        throw new Error('用户不存在')
      }

      // 验证当前密码
      const isCurrentPasswordValid = await comparePassword(currentPassword, user.password!)
      if (!isCurrentPasswordValid) {
        throw new Error('当前密码错误')
      }

      // 哈希新密码
      const hashedNewPassword = await hashPassword(newPassword)

      // 更新密码
      user.password = hashedNewPassword
      await user.save()

      // 删除所有refresh token强制重新登录
      await redisClient.del(`refresh_token:${userId}`)

      logger.info(`Password changed for user: ${userId}`)
    } catch (error) {
      logger.error('Change password error:', error)
      throw error
    }
  }

  /**
   * 忘记密码
   */
  async forgotPassword(email: string): Promise<string> {
    try {
      const user = await User.findOne({ email: email.toLowerCase() })
      if (!user) {
        // 为了安全，即使用户不存在也返回成功
        return '如果该邮箱存在，重置链接已发送'
      }

      // 生成重置token
      const resetToken = generateResetToken()

      // 存储到Redis，设置1小时过期
      await redisClient.set(
        `reset_token:${resetToken}`,
        user._id.toString(),
        60 * 60 // 1小时
      )

      // TODO: 发送邮件
      // await emailService.sendPasswordResetEmail(user.email, resetToken)

      logger.info(`Password reset token generated for: ${email}`)

      return '如果该邮箱存在，重置链接已发送'
    } catch (error) {
      logger.error('Forgot password error:', error)
      throw error
    }
  }

  /**
   * 重置密码
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      // 从Redis获取用户ID
      const userId = await redisClient.get(`reset_token:${token}`)
      if (!userId) {
        throw new Error('重置链接已过期或无效')
      }

      // 验证用户存在
      const user = await User.findById(userId)
      if (!user) {
        throw new Error('用户不存在')
      }

      // 哈希新密码
      const hashedNewPassword = await hashPassword(newPassword)

      // 更新密码
      user.password = hashedNewPassword
      await user.save()

      // 删除重置token
      await redisClient.del(`reset_token:${token}`)

      // 删除所有refresh token强制重新登录
      await redisClient.del(`refresh_token:${user._id}`)

      logger.info(`Password reset for user: ${userId}`)
    } catch (error) {
      logger.error('Reset password error:', error)
      throw error
    }
  }

  /**
   * 验证邮箱
   */
  async verifyEmail(token: string): Promise<void> {
    try {
      // 简化实现 - 实际应该有更完善的邮箱验证流程
      const userId = await redisClient.get(`verify_token:${token}`)
      if (!userId) {
        throw new Error('验证链接已过期或无效')
      }

      const user = await User.findById(userId)
      if (!user) {
        throw new Error('用户不存在')
      }

      user.emailVerified = true
      await user.save()

      await redisClient.del(`verify_token:${token}`)

      logger.info(`Email verified for user: ${userId}`)
    } catch (error) {
      logger.error('Email verification error:', error)
      throw error
    }
  }
}

export const authService = new AuthService()