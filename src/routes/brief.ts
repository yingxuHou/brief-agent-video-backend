import { Router } from 'express'
import { briefController, generateBriefValidation, updateBriefStatusValidation } from '@/controllers/briefController.js'
import { authenticate, authorize, authorizeResourceOwner } from '@/middleware/auth.js'
import { asyncHandler } from '@/middleware/errorHandler.js'

const router = Router()

/**
 * @swagger
 * components:
 *   schemas:
 *     Brief:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Brief ID
 *         title:
 *           type: string
 *           description: Brief标题
 *         project:
 *           type: string
 *           description: 关联项目ID
 *         brand:
 *           type: string
 *           description: 品牌方ID
 *         content:
 *           type: object
 *           properties:
 *             overview:
 *               type: string
 *               description: 项目概述
 *             objectives:
 *               type: array
 *               items:
 *                 type: string
 *               description: 营销目标
 *             targetAudience:
 *               type: string
 *               description: 目标受众
 *             sellingPoints:
 *               type: array
 *               items:
 *                 type: string
 *               description: 产品卖点
 *             creativeDirection:
 *               type: string
 *               description: 创意方向
 *             deliverables:
 *               type: array
 *               items:
 *                 type: string
 *               description: 交付要求
 *         status:
 *           type: string
 *           enum: [draft, generated, approved, rejected, in_progress, completed]
 *           description: Brief状态
 *         generationInfo:
 *           type: object
 *           properties:
 *             method:
 *               type: string
 *               enum: [manual, ai, template]
 *               description: 生成方式
 *             aiModel:
 *               type: string
 *               description: AI模型
 *             generationTime:
 *               type: number
 *               description: 生成耗时(ms)
 *         aiAnalysis:
 *           type: object
 *           properties:
 *             sentiment:
 *               type: string
 *               enum: [positive, neutral, negative]
 *               description: 情感分析
 *             complexity:
 *               type: string
 *               enum: [low, medium, high]
 *               description: 复杂度
 *             compliance:
 *               type: object
 *               properties:
 *                 score:
 *                   type: number
 *                   description: 合规分数(0-100)
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           description: 标签
 *         category:
 *           type: string
 *           description: 分类
 *         industry:
 *           type: string
 *           description: 行业
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: 创建时间
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: 更新时间
 */

/**
 * @swagger
 * /api/brief/generate:
 *   post:
 *     summary: 生成AI Brief
 *     tags: [Brief]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - projectName
 *               - brandName
 *               - product
 *               - objectives
 *               - targetAudience
 *               - sellingPoints
 *               - message
 *               - contentType
 *               - tone
 *               - platforms
 *             properties:
 *               projectId:
 *                 type: string
 *                 description: 项目ID(可选)
 *               projectName:
 *                 type: string
 *                 description: 项目名称
 *                 maxLength: 100
 *               brandName:
 *                 type: string
 *                 description: 品牌名称
 *                 maxLength: 100
 *               product:
 *                 type: string
 *                 description: 产品/服务
 *                 maxLength: 100
 *               objectives:
 *                 type: array
 *                 description: 营销目标
 *                 minItems: 1
 *                 items:
 *                   type: string
 *               targetAudience:
 *                 type: string
 *                 description: 目标受众
 *                 maxLength: 500
 *               sellingPoints:
 *                 type: string
 *                 description: 产品卖点
 *                 maxLength: 1000
 *               message:
 *                 type: string
 *                 description: 传播诉求
 *                 maxLength: 500
 *               contentType:
 *                 type: string
 *                 enum: [video, image, live, article]
 *                 description: 内容类型
 *               tone:
 *                 type: string
 *                 description: 风格调性
 *               platforms:
 *                 type: array
 *                 description: 发布平台
 *                 minItems: 1
 *                 items:
 *                   type: string
 *                   enum: [douyin, xiaohongshu, weibo, wechat, bilibili, kuaishou]
 *     responses:
 *       201:
 *         description: Brief生成成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Brief生成成功
 *                 data:
 *                   type: object
 *                   properties:
 *                     brief:
 *                       $ref: '#/components/schemas/Brief'
 *                     generationTime:
 *                       type: number
 *                       description: 生成耗时(ms)
 *                     tokensUsed:
 *                       type: number
 *                       description: 使用的token数
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 用户未认证
 */
router.post('/generate',
  authenticate,
  generateBriefValidation,
  asyncHandler(briefController.generateBrief.bind(briefController))
)

/**
 * @swagger
 * /api/brief/draft:
 *   post:
 *     summary: 保存Brief草稿
 *     tags: [Brief]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - projectName
 *               - brandName
 *               - product
 *               - objectives
 *               - targetAudience
 *               - sellingPoints
 *               - message
 *               - contentType
 *               - tone
 *               - platforms
 *             properties:
 *               briefId:
 *                 type: string
 *                 description: Brief ID(更新草稿时提供)
 *               projectId:
 *                 type: string
 *                 description: 项目ID(可选)
 *               projectName:
 *                 type: string
 *                 description: 项目名称
 *               brandName:
 *                 type: string
 *                 description: 品牌名称
 *               product:
 *                 type: string
 *                 description: 产品/服务
 *               objectives:
 *                 type: array
 *                 items:
 *                   type: string
 *               targetAudience:
 *                 type: string
 *                 description: 目标受众
 *               sellingPoints:
 *                 type: string
 *                 description: 产品卖点
 *               message:
 *                 type: string
 *                 description: 传播诉求
 *               contentType:
 *                 type: string
 *                 enum: [video, image, live, article]
 *               tone:
 *                 type: string
 *                 description: 风格调性
 *               platforms:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: 草稿保存成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 草稿保存成功
 *                 data:
 *                   type: object
 *                   properties:
 *                     brief:
 *                       $ref: '#/components/schemas/Brief'
 */
router.post('/draft',
  authenticate,
  generateBriefValidation,
  asyncHandler(briefController.saveDraft.bind(briefController))
)

/**
 * @swagger
 * /api/brief:
 *   get:
 *     summary: 获取Brief列表
 *     tags: [Brief]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 页码
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: 每页数量
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, draft, generated, approved, rejected, in_progress, completed]
 *         description: 状态筛选
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: string
 *         description: 项目ID筛选
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: 搜索关键词
 *     responses:
 *       200:
 *         description: 获取成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     briefs:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Brief'
 *                     total:
 *                       type: integer
 *                       description: 总数量
 *                     page:
 *                       type: integer
 *                       description: 当前页码
 *                     totalPages:
 *                       type: integer
 *                       description: 总页数
 */
router.get('/',
  authenticate,
  asyncHandler(briefController.getBriefs.bind(briefController))
)

/**
 * @swagger
 * /api/brief/stats:
 *   get:
 *     summary: 获取Brief统计信息
 *     tags: [Brief]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 获取成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     stats:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                           description: 总Brief数
 *                         draft:
 *                           type: integer
 *                           description: 草稿数
 *                         generated:
 *                           type: integer
 *                           description: 已生成数
 *                         approved:
 *                           type: integer
 *                           description: 已批准数
 *                         in_progress:
 *                           type: integer
 *                           description: 进行中数
 *                         completed:
 *                           type: integer
 *                           description: 已完成数
 *                         rejected:
 *                           type: integer
 *                           description: 已拒绝数
 */
router.get('/stats',
  authenticate,
  asyncHandler(briefController.getBriefStats.bind(briefController))
)

/**
 * @swagger
 * /api/brief/{briefId}:
 *   get:
 *     summary: 获取单个Brief详情
 *     tags: [Brief]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: briefId
 *         required: true
 *         schema:
 *           type: string
 *         description: Brief ID
 *     responses:
 *       200:
 *         description: 获取成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     brief:
 *                       $ref: '#/components/schemas/Brief'
 *       404:
 *         description: Brief不存在
 */
router.get('/:briefId',
  authenticate,
  asyncHandler(briefController.getBriefById.bind(briefController))
)

/**
 * @swagger
 * /api/brief/{briefId}:
 *   put:
 *     summary: 更新Brief状态
 *     tags: [Brief]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: briefId
 *         required: true
 *         schema:
 *           type: string
 *         description: Brief ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [draft, generated, approved, rejected, in_progress, completed]
 *                 description: 新状态
 *               feedback:
 *                 type: string
 *                 description: 反馈意见
 *                 maxLength: 1000
 *     responses:
 *       200:
 *         description: 更新成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Brief状态更新成功
 *                 data:
 *                   type: object
 *                   properties:
 *                     brief:
 *                       $ref: '#/components/schemas/Brief'
 */
router.put('/:briefId',
  authenticate,
  updateBriefStatusValidation,
  asyncHandler(briefController.updateBriefStatus.bind(briefController))
)

/**
 * @swagger
 * /api/brief/{briefId}:
 *   delete:
 *     summary: 删除Brief
 *     tags: [Brief]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: briefId
 *         required: true
 *         schema:
 *           type: string
 *         description: Brief ID
 *     responses:
 *       200:
 *         description: 删除成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Brief删除成功
 */
router.delete('/:briefId',
  authenticate,
  asyncHandler(briefController.deleteBrief.bind(briefController))
)

/**
 * @swagger
 * /api/brief/{briefId}/duplicate:
 *   post:
 *     summary: 复制Brief
 *     tags: [Brief]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: briefId
 *         required: true
 *         schema:
 *           type: string
 *         description: 要复制的Brief ID
 *     responses:
 *       201:
 *         description: 复制成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Brief复制成功
 *                 data:
 *                   type: object
 *                   properties:
 *                     brief:
 *                       $ref: '#/components/schemas/Brief'
 */
router.post('/:briefId/duplicate',
  authenticate,
  asyncHandler(briefController.duplicateBrief.bind(briefController))
)

export default router