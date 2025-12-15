import { Request, Response } from 'express'
import { briefGenerationService } from '@/services/briefGenerationService.js'
import { logger } from '@/utils/logger.js'
import { validationResult } from 'express-validator'
import mongoose from 'mongoose'

export class BriefController {
  /**
   * 生成Brief
   */
  async generateBrief(req: Request, res: Response): Promise<void> {
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

      const {
        projectId,
        projectName,
        brandName,
        product,
        objectives,
        targetAudience,
        sellingPoints,
        message,
        contentType,
        tone,
        platforms,
        templateId
      } = req.body

      const result = await briefGenerationService.generateBrief({
        userId: req.userId,
        projectId: projectId ? new mongoose.Types.ObjectId(projectId) : undefined,
        projectName,
        brandName,
        product,
        objectives,
        targetAudience,
        sellingPoints,
        message,
        contentType,
        tone,
        platforms,
        templateId
      })

      res.status(201).json({
        success: true,
        message: 'Brief生成成功',
        data: {
          brief: result.brief,
          generationTime: result.generationTime,
          tokensUsed: result.tokensUsed
        }
      })
    } catch (error) {
      logger.error('Generate brief controller error:', error)

      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Brief生成失败'
      })
    }
  }

  /**
   * 保存Brief草稿
   */
  async saveDraft(req: Request, res: Response): Promise<void> {
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

      const {
        briefId,
        projectId,
        projectName,
        brandName,
        product,
        objectives,
        targetAudience,
        sellingPoints,
        message,
        contentType,
        tone,
        platforms
      } = req.body

      const brief = await briefGenerationService.saveDraft({
        briefId,
        userId: req.userId,
        projectId: projectId ? new mongoose.Types.ObjectId(projectId) : undefined,
        projectName,
        brandName,
        product,
        objectives,
        targetAudience,
        sellingPoints,
        message,
        contentType,
        tone,
        platforms
      })

      res.status(200).json({
        success: true,
        message: briefId ? '草稿更新成功' : '草稿保存成功',
        data: { brief }
      })
    } catch (error) {
      logger.error('Save draft controller error:', error)

      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : '草稿保存失败'
      })
    }
  }

  /**
   * 获取用户的Brief列表
   */
  async getBriefs(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({
          success: false,
          message: '用户未认证'
        })
        return
      }

      const {
        page = 1,
        limit = 20,
        status,
        projectId,
        search
      } = req.query

      const result = await briefGenerationService.getUserBriefs(req.userId, {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        status: status as string,
        projectId: projectId as string,
        search: search as string
      })

      res.json({
        success: true,
        data: result
      })
    } catch (error) {
      logger.error('Get briefs controller error:', error)

      res.status(500).json({
        success: false,
        message: '获取Brief列表失败'
      })
    }
  }

  /**
   * 获取单个Brief详情
   */
  async getBriefById(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({
          success: false,
          message: '用户未认证'
        })
        return
      }

      const { briefId } = req.params

      if (!mongoose.Types.ObjectId.isValid(briefId)) {
        res.status(400).json({
          success: false,
          message: '无效的Brief ID'
        })
        return
      }

      const brief = await briefGenerationService.getBriefById(briefId, req.userId)

      res.json({
        success: true,
        data: { brief }
      })
    } catch (error) {
      logger.error('Get brief by ID controller error:', error)

      res.status(404).json({
        success: false,
        message: error instanceof Error ? error.message : 'Brief不存在'
      })
    }
  }

  /**
   * 更新Brief状态
   */
  async updateBriefStatus(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({
          success: false,
          message: '用户未认证'
        })
        return
      }

      const { briefId } = req.params
      const { status, feedback } = req.body

      if (!mongoose.Types.ObjectId.isValid(briefId)) {
        res.status(400).json({
          success: false,
          message: '无效的Brief ID'
        })
        return
      }

      if (!['draft', 'generated', 'approved', 'rejected', 'in_progress', 'completed'].includes(status)) {
        res.status(400).json({
          success: false,
          message: '无效的状态值'
        })
        return
      }

      const brief = await briefGenerationService.updateBriefStatus(
        briefId,
        req.userId,
        status,
        feedback
      )

      res.json({
        success: true,
        message: 'Brief状态更新成功',
        data: { brief }
      })
    } catch (error) {
      logger.error('Update brief status controller error:', error)

      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Brief状态更新失败'
      })
    }
  }

  /**
   * 删除Brief
   */
  async deleteBrief(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({
          success: false,
          message: '用户未认证'
        })
        return
      }

      const { briefId } = req.params

      if (!mongoose.Types.ObjectId.isValid(briefId)) {
        res.status(400).json({
          success: false,
          message: '无效的Brief ID'
        })
        return
      }

      await briefGenerationService.deleteBrief(briefId, req.userId)

      res.json({
        success: true,
        message: 'Brief删除成功'
      })
    } catch (error) {
      logger.error('Delete brief controller error:', error)

      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Brief删除失败'
      })
    }
  }

  /**
   * 复制Brief
   */
  async duplicateBrief(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({
          success: false,
          message: '用户未认证'
        })
        return
      }

      const { briefId } = req.params

      if (!mongoose.Types.ObjectId.isValid(briefId)) {
        res.status(400).json({
          success: false,
          message: '无效的Brief ID'
        })
        return
      }

      // 获取原Brief
      const originalBrief = await briefGenerationService.getBriefById(briefId, req.userId)

      // 创建新的Brief（复制内容但改变状态为草稿）
      const { Brief } = await import('@/models/Brief.js')
      const newBrief = new Brief({
        title: `${originalBrief.title} - 副本`,
        project: originalBrief.project?._id,
        brand: req.userId,
        content: originalBrief.content,
        generationInfo: {
          method: 'manual',
          generationTime: 0
        },
        status: 'draft',
        priority: originalBrief.priority,
        collaboration: {
          assignedTo: [],
          feedback: [],
          versions: [{
            version: 1,
            content: originalBrief.content,
            modifiedBy: new mongoose.Types.ObjectId(req.userId),
            modifiedAt: new Date(),
            changeDescription: '复制Brief'
          }]
        },
        aiAnalysis: originalBrief.aiAnalysis,
        tags: originalBrief.tags,
        category: originalBrief.category,
        industry: originalBrief.industry,
        metadata: {
          createdBy: new mongoose.Types.ObjectId(req.userId),
          lastModifiedBy: new mongoose.Types.ObjectId(req.userId)
        }
      })

      await newBrief.save()

      res.status(201).json({
        success: true,
        message: 'Brief复制成功',
        data: { brief: newBrief }
      })
    } catch (error) {
      logger.error('Duplicate brief controller error:', error)

      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Brief复制失败'
      })
    }
  }

  /**
   * 获取Brief统计信息
   */
  async getBriefStats(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({
          success: false,
          message: '用户未认证'
        })
        return
      }

      const { Brief } = await import('@/models/Brief.js')

      const stats = await Brief.aggregate([
        { $match: { brand: new mongoose.Types.ObjectId(req.userId) } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ])

      const totalBriefs = stats.reduce((sum, stat) => sum + stat.count, 0)

      const result = {
        total: totalBriefs,
        draft: stats.find(s => s._id === 'draft')?.count || 0,
        generated: stats.find(s => s._id === 'generated')?.count || 0,
        approved: stats.find(s => s._id === 'approved')?.count || 0,
        in_progress: stats.find(s => s._id === 'in_progress')?.count || 0,
        completed: stats.find(s => s._id === 'completed')?.count || 0,
        rejected: stats.find(s => s._id === 'rejected')?.count || 0
      }

      res.json({
        success: true,
        data: { stats: result }
      })
    } catch (error) {
      logger.error('Get brief stats controller error:', error)

      res.status(500).json({
        success: false,
        message: '获取Brief统计失败'
      })
    }
  }
}

export const briefController = new BriefController()

// 验证规则
export const generateBriefValidation = [
  // body('projectId').optional().isMongoId().withMessage('项目ID格式错误'),
  body('projectName')
    .notEmpty()
    .withMessage('项目名称不能为空')
    .isLength({ max: 100 })
    .withMessage('项目名称长度不能超过100字符'),

  body('brandName')
    .notEmpty()
    .withMessage('品牌名称不能为空')
    .isLength({ max: 100 })
    .withMessage('品牌名称长度不能超过100字符'),

  body('product')
    .notEmpty()
    .withMessage('产品/服务不能为空')
    .isLength({ max: 100 })
    .withMessage('产品/服务名称长度不能超过100字符'),

  body('objectives')
    .isArray({ min: 1 })
    .withMessage('至少选择一个营销目标'),

  body('targetAudience')
    .notEmpty()
    .withMessage('目标受众不能为空')
    .isLength({ max: 500 })
    .withMessage('目标受众描述长度不能超过500字符'),

  body('sellingPoints')
    .notEmpty()
    .withMessage('产品卖点不能为空')
    .isLength({ max: 1000 })
    .withMessage('产品卖点长度不能超过1000字符'),

  body('message')
    .notEmpty()
    .withMessage('传播诉求不能为空')
    .isLength({ max: 500 })
    .withMessage('传播诉求长度不能超过500字符'),

  body('contentType')
    .isIn(['video', 'image', 'live', 'article'])
    .withMessage('内容类型必须是video、image、live或article'),

  body('tone')
    .notEmpty()
    .withMessage('风格调性不能为空'),

  body('platforms')
    .isArray({ min: 1 })
    .withMessage('至少选择一个平台')
    .custom((platforms) => {
      const validPlatforms = ['douyin', 'xiaohongshu', 'weibo', 'wechat', 'bilibili', 'kuaishou']
      const invalidPlatforms = platforms.filter(p => !validPlatforms.includes(p))
      if (invalidPlatforms.length > 0) {
        throw new Error(`无效的平台: ${invalidPlatforms.join(', ')}`)
      }
      return true
    })
]

export const updateBriefStatusValidation = [
  body('status')
    .isIn(['draft', 'generated', 'approved', 'rejected', 'in_progress', 'completed'])
    .withMessage('无效的状态值'),

  body('feedback')
    .optional()
    .isString()
    .withMessage('反馈必须是字符串')
    .isLength({ max: 1000 })
    .withMessage('反馈长度不能超过1000字符')
]