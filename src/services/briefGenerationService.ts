import { Brief, IBrief } from '@/models/Brief.js'
import { Project, IProject } from '@/models/Project.js'
import { User, IUser } from '@/models/User.js'
import { glmService } from './glmService.js'
import { redisClient } from '@/config/redis.js'
import { logger } from '@/utils/logger.js'
import mongoose from 'mongoose'

export interface BriefGenerationInput {
  userId: string
  projectId?: string
  projectName: string
  brandName: string
  product: string
  objectives: string[]
  targetAudience: string
  sellingPoints: string
  message: string
  contentType: 'video' | 'image' | 'live' | 'article'
  tone: string
  platforms: string[]
  templateId?: string
}

export interface BriefGenerationResult {
  brief: IBrief
  generationTime: number
  tokensUsed: number
}

export class BriefGenerationService {
  /**
   * 生成Brief
   */
  async generateBrief(input: BriefGenerationInput): Promise<BriefGenerationResult> {
    const startTime = Date.now()

    try {
      // 验证用户存在
      const user = await User.findById(input.userId)
      if (!user) {
        throw new Error('用户不存在')
      }

      // 如果指定了项目ID，验证项目存在且用户有权限
      let project: IProject | null = null
      if (input.projectId) {
        project = await Project.findById(input.projectId)
        if (!project) {
          throw new Error('项目不存在')
        }
        if (project.brand.toString() !== input.userId && user.role !== 'admin') {
          throw new Error('无权限访问该项目')
        }
      }

      // 检查用户的订阅限制
      await this.checkUserLimits(user)

      // 调用AI服务生成Brief
      const aiResult = await glmService.generateBrief({
        projectName: input.projectName,
        brandName: input.brandName,
        product: input.product,
        objectives: input.objectives,
        targetAudience: input.targetAudience,
        sellingPoints: input.sellingPoints,
        message: input.message,
        contentType: input.contentType,
        tone: input.tone,
        platforms: input.platforms,
      })

      const generationTime = Date.now() - startTime

      // 创建Brief记录
      const brief = new Brief({
        title: aiResult.title,
        project: input.projectId || null,
        brand: input.userId,
        content: {
          overview: aiResult.overview,
          objectives: aiResult.objectives,
          targetAudience: aiResult.targetAudience,
          sellingPoints: aiResult.sellingPoints,
          message: input.message,
          creativeDirection: aiResult.creativeDirection,
          deliverables: aiResult.deliverables,
          restrictions: [],
          examples: []
        },
        generationInfo: {
          method: 'ai',
          aiModel: 'glm-4',
          generationTime,
          tokensUsed: 0, // GLM暂未返回token使用量
        },
        status: 'generated',
        priority: 'medium',
        collaboration: {
          assignedTo: [],
          feedback: [],
          versions: [{
            version: 1,
            content: aiResult,
            modifiedBy: input.userId,
            modifiedAt: new Date(),
            changeDescription: 'AI生成初始版本'
          }]
        },
        aiAnalysis: {
          sentiment: 'positive',
          complexity: 'medium',
          compliance: aiResult.compliance,
          predictions: {
            engagement: 75,
            conversion: 15,
            reach: 10000
          }
        },
        tags: this.generateTags(input),
        category: this.categorizeContent(input.contentType, input.objectives),
        industry: project?.settings.industry || '通用',
        metadata: {
          createdBy: input.userId,
          publishedAt: new Date()
        }
      })

      await brief.save()

      // 更新用户统计
      await this.updateUserStats(input.userId, 'brief_created')

      // 如果有关联项目，更新项目中的Brief列表
      if (project) {
        project.briefs.push(brief._id)
        await project.save()
      }

      // 缓存Brief摘要信息
      await this.cacheBriefSummary(brief._id.toString(), {
        title: brief.title,
        status: brief.status,
        createdAt: brief.createdAt
      })

      logger.info(`Brief generated successfully: ${brief._id}`, {
        userId: input.userId,
        projectId: input.projectId,
        generationTime
      })

      return {
        brief,
        generationTime,
        tokensUsed: 0
      }

    } catch (error) {
      logger.error('Brief generation failed:', error)
      throw error
    }
  }

  /**
   * 保存Brief草稿
   */
  async saveDraft(input: BriefGenerationInput & { briefId?: string }): Promise<IBrief> {
    try {
      let brief: IBrief

      if (input.briefId) {
        // 更新现有草稿
        brief = await Brief.findById(input.briefId)
        if (!brief) {
          throw new Error('Brief不存在')
        }
        if (brief.brand.toString() !== input.userId) {
          throw new Error('无权限修改该Brief')
        }

        brief.title = input.projectName
        brief.content.overview = `为${input.brandName}的${input.product}项目保存的草稿`
        brief.content.objectives = input.objectives
        brief.content.targetAudience = input.targetAudience
        brief.content.sellingPoints = input.sellingPoints.split('\n').filter(p => p.trim())
        brief.content.message = input.message
        brief.metadata.lastModifiedBy = input.userId
        brief.metadata.updatedAt = new Date()

        await brief.save()
      } else {
        // 创建新草稿
        brief = new Brief({
          title: `${input.projectName} - 草稿`,
          project: input.projectId || null,
          brand: input.userId,
          content: {
            overview: `为${input.brandName}的${input.product}项目保存的草稿`,
            objectives: input.objectives,
            targetAudience: input.targetAudience,
            sellingPoints: input.sellingPoints.split('\n').filter(p => p.trim()),
            message: input.message,
            creativeDirection: '',
            deliverables: [],
            restrictions: [],
            examples: []
          },
          generationInfo: {
            method: 'manual'
          },
          status: 'draft',
          priority: 'medium',
          collaboration: {
            assignedTo: [],
            feedback: [],
            versions: [{
              version: 1,
              content: {},
              modifiedBy: input.userId,
              modifiedAt: new Date(),
              changeDescription: '创建草稿'
            }]
          },
          tags: this.generateTags(input),
          category: this.categorizeContent(input.contentType, input.objectives),
          industry: '通用',
          metadata: {
            createdBy: input.userId,
            lastModifiedBy: input.userId
          }
        })

        await brief.save()
      }

      return brief
    } catch (error) {
      logger.error('Save draft failed:', error)
      throw error
    }
  }

  /**
   * 获取用户的Brief列表
   */
  async getUserBriefs(
    userId: string,
    options: {
      page?: number
      limit?: number
      status?: string
      projectId?: string
      search?: string
    } = {}
  ): Promise<{ briefs: IBrief[]; total: number; page: number; totalPages: number }> {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        projectId,
        search
      } = options

      const query: any = { brand: userId }

      if (status && status !== 'all') {
        query.status = status
      }

      if (projectId) {
        query.project = projectId
      }

      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { 'content.overview': { $regex: search, $options: 'i' } }
        ]
      }

      const skip = (page - 1) * limit

      const [briefs, total] = await Promise.all([
        Brief.find(query)
          .populate('project', 'name')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Brief.countDocuments(query)
      ])

      const totalPages = Math.ceil(total / limit)

      return {
        briefs,
        total,
        page,
        totalPages
      }
    } catch (error) {
      logger.error('Get user briefs failed:', error)
      throw error
    }
  }

  /**
   * 获取单个Brief详情
   */
  async getBriefById(briefId: string, userId: string): Promise<IBrief> {
    try {
      const brief = await Brief.findById(briefId)
        .populate('project', 'name settings')
        .populate('brand', 'username profile')
        .populate('collaboration.feedback.user', 'username profile')

      if (!brief) {
        throw new Error('Brief不存在')
      }

      // 检查权限：品牌方、被分配的达人或管理员可以查看
      const hasPermission =
        brief.brand._id.toString() === userId ||
        brief.collaboration.assignedTo.some(assignedId => assignedId.toString() === userId)

      if (!hasPermission) {
        throw new Error('无权限查看该Brief')
      }

      return brief
    } catch (error) {
      logger.error('Get brief by ID failed:', error)
      throw error
    }
  }

  /**
   * 更新Brief状态
   */
  async updateBriefStatus(
    briefId: string,
    userId: string,
    status: 'draft' | 'generated' | 'approved' | 'rejected' | 'in_progress' | 'completed',
    feedback?: string
  ): Promise<IBrief> {
    try {
      const brief = await Brief.findById(briefId)
      if (!brief) {
        throw new Error('Brief不存在')
      }

      // 检查权限
      if (brief.brand.toString() !== userId) {
        throw new Error('无权限修改该Brief')
      }

      brief.status = status

      // 如果提供了反馈，添加到协作反馈中
      if (feedback) {
        brief.collaboration.feedback.push({
          user: new mongoose.Types.ObjectId(userId),
          content: feedback,
          rating: status === 'approved' ? 5 : status === 'rejected' ? 2 : 3,
          createdAt: new Date()
        })
      }

      // 更新完成时间
      if (status === 'completed') {
        brief.metadata.completedAt = new Date()
      }

      brief.metadata.lastModifiedBy = new mongoose.Types.ObjectId(userId)
      brief.metadata.updatedAt = new Date()

      await brief.save()

      // 清除缓存
      await redisClient.del(`brief_summary:${briefId}`)

      return brief
    } catch (error) {
      logger.error('Update brief status failed:', error)
      throw error
    }
  }

  /**
   * 删除Brief
   */
  async deleteBrief(briefId: string, userId: string): Promise<void> {
    try {
      const brief = await Brief.findById(briefId)
      if (!brief) {
        throw new Error('Brief不存在')
      }

      // 检查权限
      if (brief.brand.toString() !== userId) {
        throw new Error('无权限删除该Brief')
      }

      await Brief.findByIdAndDelete(briefId)

      // 清除缓存
      await redisClient.del(`brief_summary:${briefId}`)

      logger.info(`Brief deleted: ${briefId}`)
    } catch (error) {
      logger.error('Delete brief failed:', error)
      throw error
    }
  }

  /**
   * 检查用户订阅限制
   */
  private async checkUserLimits(user: IUser): Promise<void> {
    const currentMonth = new Date()
    currentMonth.setDate(1)
    currentMonth.setHours(0, 0, 0, 0)

    const monthBriefsCount = await Brief.countDocuments({
      brand: user._id,
      'metadata.createdAt': { $gte: currentMonth }
    })

    const planLimits = {
      free: 5,
      basic: 50,
      professional: 200,
      enterprise: Infinity
    }

    const userPlan = user.subscription?.plan || 'free'
    const limit = planLimits[userPlan]

    if (monthBriefsCount >= limit) {
      throw new Error(`当前月度Brief生成次数已达上限(${limit}次)，请升级订阅计划`)
    }
  }

  /**
   * 更新用户统计
   */
  private async updateUserStats(userId: string, action: 'brief_created' | 'brief_completed'): Promise<void> {
    try {
      const updateField = action === 'brief_created' ? 'briefsCount' : 'stats.projectsCount'
      await User.findByIdAndUpdate(userId, {
        $inc: { [updateField]: 1 }
      })
    } catch (error) {
      logger.error('Update user stats failed:', error)
    }
  }

  /**
   * 生成标签
   */
  private generateTags(input: BriefGenerationInput): string[] {
    const tags = []

    // 基于内容类型
    tags.push(input.contentType)

    // 基于平台
    input.platforms.forEach(platform => {
      tags.push(platform)
    })

    // 基于目标
    input.objectives.forEach(objective => {
      tags.push(objective)
    })

    // 基于风格
    tags.push(input.tone)

    return [...new Set(tags)] // 去重
  }

  /**
   * 内容分类
   */
  private categorizeContent(contentType: string, objectives: string[]): string {
    if (objectives.includes('产品销售') || objectives.includes('sales')) {
      return '电商营销'
    } else if (objectives.includes('品牌曝光') || objectives.includes('brand_awareness')) {
      return '品牌推广'
    } else if (objectives.includes('用户增长') || objectives.includes('user_growth')) {
      return '用户拉新'
    } else if (objectives.includes('内容营销') || objectives.includes('content_marketing')) {
      return '内容创作'
    } else {
      return '营销推广'
    }
  }

  /**
   * 缓存Brief摘要
   */
  private async cacheBriefSummary(briefId: string, summary: any): Promise<void> {
    try {
      await redisClient.set(
        `brief_summary:${briefId}`,
        JSON.stringify(summary),
        3600 // 1小时过期
      )
    } catch (error) {
      logger.error('Cache brief summary failed:', error)
    }
  }
}

export const briefGenerationService = new BriefGenerationService()