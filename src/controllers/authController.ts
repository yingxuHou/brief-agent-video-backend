import { Request, Response } from 'express'
import { authService } from '@/services/authService.js'
import { validatePasswordStrength } from '@/utils/auth.js'
import { validationResult, body } from 'express-validator'
import { logger } from '@/utils/logger.js'

export class AuthController {
  /**
   * 用户注册
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      // 验证输入
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: '输入验证失败',
          errors: errors.array()
        })
        return
      }

      const { username, email, password, role, firstName, lastName, company, jobTitle } = req.body

      // 验证密码强度
      const passwordValidation = validatePasswordStrength(password)
      if (!passwordValidation.isValid) {
        res.status(400).json({
          success: false,
          message: passwordValidation.message
        })
        return
      }

      const result = await authService.register({
        username,
        email,
        password,
        role,
        firstName,
        lastName,
        company,
        jobTitle
      })

      res.status(201).json({
        success: true,
        message: '注册成功',
        data: result
      })
    } catch (error) {
      logger.error('Register controller error:', error)

      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : '注册失败'
      })
    }
  }

  /**
   * 用户登录
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      // 验证输入
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: '输入验证失败',
          errors: errors.array()
        })
        return
      }

      const { email, password } = req.body

      const result = await authService.login({ email, password })

      res.json({
        success: true,
        message: '登录成功',
        data: result
      })
    } catch (error) {
      logger.error('Login controller error:', error)

      res.status(401).json({
        success: false,
        message: error instanceof Error ? error.message : '登录失败'
      })
    }
  }

  /**
   * 用户登出
   */
  async logout(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({
          success: false,
          message: '用户未认证'
        })
        return
      }

      await authService.logout(req.userId)

      res.json({
        success: true,
        message: '登出成功'
      })
    } catch (error) {
      logger.error('Logout controller error:', error)

      res.status(500).json({
        success: false,
        message: '登出失败'
      })
    }
  }

  /**
   * 获取当前用户信息
   */
  async getCurrentUser(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: '用户未认证'
        })
        return
      }

      res.json({
        success: true,
        data: {
          user: req.user
        }
      })
    } catch (error) {
      logger.error('Get current user controller error:', error)

      res.status(500).json({
        success: false,
        message: '获取用户信息失败'
      })
    }
  }

  /**
   * 修改密码
   */
  async changePassword(req: Request, res: Response): Promise<void> {
    try {
      // 验证输入
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: '输入验证失败',
          errors: errors.array()
        })
        return
      }

      if (!req.userId) {
        res.status(401).json({
          success: false,
          message: '用户未认证'
        })
        return
      }

      const { currentPassword, newPassword } = req.body

      // 验证新密码强度
      const passwordValidation = validatePasswordStrength(newPassword)
      if (!passwordValidation.isValid) {
        res.status(400).json({
          success: false,
          message: passwordValidation.message
        })
        return
      }

      await authService.changePassword(req.userId, currentPassword, newPassword)

      res.json({
        success: true,
        message: '密码修改成功'
      })
    } catch (error) {
      logger.error('Change password controller error:', error)

      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : '密码修改失败'
      })
    }
  }

  /**
   * 忘记密码
   */
  async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      // 验证输入
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: '输入验证失败',
          errors: errors.array()
        })
        return
      }

      const { email } = req.body

      const message = await authService.forgotPassword(email)

      res.json({
        success: true,
        message
      })
    } catch (error) {
      logger.error('Forgot password controller error:', error)

      res.status(500).json({
        success: false,
        message: '发送重置链接失败'
      })
    }
  }

  /**
   * 重置密码
   */
  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      // 验证输入
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: '输入验证失败',
          errors: errors.array()
        })
        return
      }

      const { token, newPassword } = req.body

      // 验证新密码强度
      const passwordValidation = validatePasswordStrength(newPassword)
      if (!passwordValidation.isValid) {
        res.status(400).json({
          success: false,
          message: passwordValidation.message
        })
        return
      }

      await authService.resetPassword(token, newPassword)

      res.json({
        success: true,
        message: '密码重置成功'
      })
    } catch (error) {
      logger.error('Reset password controller error:', error)

      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : '密码重置失败'
      })
    }
  }

  /**
   * 验证邮箱
   */
  async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.params

      await authService.verifyEmail(token)

      res.json({
        success: true,
        message: '邮箱验证成功'
      })
    } catch (error) {
      logger.error('Verify email controller error:', error)

      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : '邮箱验证失败'
      })
    }
  }
}

export const authController = new AuthController()

// 验证规则
export const registerValidation = [
  body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('用户名长度必须在3-30字符之间')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('用户名只能包含字母、数字和下划线'),

  body('email')
    .isEmail()
    .withMessage('请输入有效的邮箱地址')
    .normalizeEmail(),

  body('password')
    .isLength({ min: 6 })
    .withMessage('密码长度至少为6位'),

  body('role')
    .isIn(['brand', 'creator'])
    .withMessage('角色必须是brand或creator'),

  body('firstName')
    .notEmpty()
    .withMessage('名字不能为空')
    .isLength({ max: 50 })
    .withMessage('名字长度不能超过50字符'),

  body('lastName')
    .notEmpty()
    .withMessage('姓氏不能为空')
    .isLength({ max: 50 })
    .withMessage('姓氏长度不能超过50字符'),

  body('company')
    .optional()
    .isLength({ max: 100 })
    .withMessage('公司名称长度不能超过100字符'),

  body('jobTitle')
    .optional()
    .isLength({ max: 100 })
    .withMessage('职位名称长度不能超过100字符')
]

export const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('请输入有效的邮箱地址')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('密码不能为空')
]

export const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('当前密码不能为空'),

  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('新密码长度至少为6位')
]

export const forgotPasswordValidation = [
  body('email')
    .isEmail()
    .withMessage('请输入有效的邮箱地址')
    .normalizeEmail()
]

export const resetPasswordValidation = [
  body('token')
    .notEmpty()
    .withMessage('重置令牌不能为空'),

  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('新密码长度至少为6位')
]