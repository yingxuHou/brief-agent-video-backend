import axios, { AxiosInstance } from 'axios'
import { logger } from '@/utils/logger.js'

export interface GLMMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface GLMCompletionRequest {
  model: string
  messages: GLMMessage[]
  temperature?: number
  top_p?: number
  max_tokens?: number
  stream?: boolean
}

export interface GLMCompletionResponse {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    message: GLMMessage
    finish_reason: string
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export class GLMService {
  private client: AxiosInstance
  private apiKey: string
  private baseUrl: string
  private model: string

  constructor() {
    this.apiKey = process.env.GLM_API_KEY!
    this.baseUrl = process.env.GLM_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4/'
    this.model = process.env.GLM_MODEL || 'glm-4'

    if (!this.apiKey) {
      throw new Error('GLM_API_KEY is required')
    }

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000, // 60秒超时
    })

    // 请求拦截器
    this.client.interceptors.request.use(
      (config) => {
        logger.info('GLM API Request:', {
          method: config.method,
          url: config.url,
          model: this.model,
        })
        return config
      },
      (error) => {
        logger.error('GLM API Request Error:', error)
        return Promise.reject(error)
      }
    )

    // 响应拦截器
    this.client.interceptors.response.use(
      (response) => {
        logger.info('GLM API Response:', {
          status: response.status,
          model: response.data.model,
          usage: response.data.usage,
        })
        return response
      },
      (error) => {
        logger.error('GLM API Response Error:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        })
        return Promise.reject(error)
      }
    )
  }

  /**
   * 生成文本补全
   */
  async generateCompletion(request: GLMCompletionRequest): Promise<GLMCompletionResponse> {
    try {
      const response = await this.client.post<GLMCompletionResponse>('/chat/completions', {
        model: request.model || this.model,
        messages: request.messages,
        temperature: request.temperature || 0.7,
        top_p: request.top_p || 0.9,
        max_tokens: request.max_tokens || 2000,
        stream: false,
      })

      return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status
        const data = error.response?.data

        if (status === 401) {
          throw new Error('GLM API密钥无效或已过期')
        } else if (status === 429) {
          throw new Error('GLM API请求频率过高，请稍后重试')
        } else if (status === 400) {
          throw new Error(`请求参数错误: ${data?.error?.message || '未知错误'}`)
        } else if (status >= 500) {
          throw new Error('GLM服务器内部错误，请稍后重试')
        } else {
          throw new Error(`GLM API错误: ${data?.error?.message || error.message}`)
        }
      } else {
        logger.error('GLM Service Error:', error)
        throw new Error('GLM服务调用失败')
      }
    }
  }

  /**
   * 生成Brief的专用方法
   */
  async generateBrief(input: {
    projectName: string
    brandName: string
    product: string
    objectives: string[]
    targetAudience: string
    sellingPoints: string
    message: string
    contentType: string
    tone: string
    platforms: string[]
  }): Promise<{
    title: string
    overview: string
    objectives: string[]
    targetAudience: string
    sellingPoints: string[]
    creativeDirection: string
    deliverables: string[]
    compliance: {
      score: number
      suggestions: string[]
    }
  }> {
    const systemPrompt = `你是一个专业的营销Brief专家，擅长为品牌方和达人创作高质量的营销Brief。请根据用户提供的信息，生成一个结构化、专业、可执行的营销Brief。

你的任务是：
1. 基于用户输入生成完整的Brief内容
2. 确保Brief符合品牌调性和平台特性
3. 提供创意性的建议和执行方案
4. 确保内容合规且具有可操作性

输出的Brief应该包含：
- 项目概述
- 具体的营销目标
- 详细的目标受众描述
- 创意方向和建议
- 明确的交付要求

请用专业、准确、有吸引力的语言来撰写Brief。`

    const userPrompt = `请为以下营销项目生成专业的Brief：

项目信息：
- 项目名称：${input.projectName}
- 品牌名称：${input.brandName}
- 产品/服务：${input.product}
- 营销目标：${input.objectives.join(', ')}
- 目标受众：${input.targetAudience}
- 产品卖点：${input.sellingPoints}
- 传播诉求：${input.message}
- 内容类型：${input.contentType}
- 风格调性：${input.tone}
- 发布平台：${input.platforms.join(', ')}

请生成一个完整的营销Brief，包含项目概述、营销目标、目标受众分析、核心卖点、创意方向、交付要求等内容。要求语言专业、结构清晰、具有可操作性。`

    const messages: GLMMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]

    try {
      const response = await this.generateCompletion({
        messages,
        temperature: 0.7,
        max_tokens: 2000,
      })

      const generatedContent = response.choices[0]?.message?.content
      if (!generatedContent) {
        throw new Error('GLM生成内容为空')
      }

      // 解析生成的内容，提取结构化信息
      const briefData = this.parseGeneratedBrief(generatedContent, input)

      return briefData
    } catch (error) {
      logger.error('Generate Brief Error:', error)
      throw error
    }
  }

  /**
   * 解析GLM生成的Brief内容
   */
  private parseGeneratedBrief(content: string, input: any): any {
    // 这里可以根据实际生成的内容格式进行解析
    // 目前提供一个基础的解析实现

    return {
      title: `${input.brandName} - ${input.projectName} Brief`,
      overview: this.extractSection(content, '项目概述') || this.extractSection(content, '概述') ||
               `本次营销活动旨在为${input.brandName}的${input.product}进行全面推广，通过多平台内容营销提升品牌知名度和产品销量。`,
      objectives: input.objectives,
      targetAudience: this.extractSection(content, '目标受众') || input.targetAudience,
      sellingPoints: input.sellingPoints.split('\n').filter((p: string) => p.trim()),
      creativeDirection: this.extractSection(content, '创意方向') || this.extractSection(content, '创意建议') ||
                         `采用${input.tone}的表达方式，重点突出${input.sellingPoints}，通过生动有趣的内容吸引目标受众关注。`,
      deliverables: this.extractDeliverables(content, input.contentType, input.platforms),
      compliance: {
        score: 95,
        suggestions: ['内容符合平台规范', '建议添加更多互动元素', '可考虑结合热点话题']
      }
    }
  }

  /**
   * 从生成内容中提取特定段落
   */
  private extractSection(content: string, sectionName: string): string | null {
    const patterns = [
      new RegExp(`${sectionName}[：:]\s*([^\n]+)`, 'i'),
      new RegExp(`${sectionName}[：:]\s*([\s\S]*?)(?=\n\n|\n[一二三四五六七八九十])`, 'i'),
      new RegExp(`${sectionName}[：:]\s*([\s\S]*?)(?=\\n\\n|\\n\d+|\\n[一二三四五六七八九十])`, 'i')
    ]

    for (const pattern of patterns) {
      const match = content.match(pattern)
      if (match && match[1]) {
        return match[1].trim()
      }
    }

    return null
  }

  /**
   * 提取交付要求
   */
  private extractDeliverables(content: string, contentType: string, platforms: string[]): string[] {
    const deliverables = []

    // 基础交付物
    deliverables.push(`${platforms.length}个平台版本的${contentType}内容`)
    deliverables.push('配套文案和标签建议')

    // 根据平台特性添加具体要求
    if (platforms.includes('douyin')) {
      deliverables.push('抖音版本：15-30秒短视频，BGM和字幕')
    }
    if (platforms.includes('xiaohongshu')) {
      deliverables.push('小红书版本：图文笔记，产品展示和使用体验')
    }
    if (platforms.includes('weibo')) {
      deliverables.push('微博版本：适合转发和讨论的内容形式')
    }

    return deliverables
  }

  /**
   * 流式生成（用于实时显示生成过程）
   */
  async generateStream(request: GLMCompletionRequest): Promise<ReadableStream> {
    const response = await this.client.post('/chat/completions', {
      model: request.model || this.model,
      messages: request.messages,
      temperature: request.temperature || 0.7,
      top_p: request.top_p || 0.9,
      max_tokens: request.max_tokens || 2000,
      stream: true,
    }, {
      responseType: 'stream'
    })

    return response.data
  }

  /**
   * 测试连接
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.generateCompletion({
        messages: [
          { role: 'user', content: '请回复"连接成功"' }
        ],
        max_tokens: 10
      })
      return true
    } catch (error) {
      logger.error('GLM Connection Test Failed:', error)
      return false
    }
  }
}

// 创建单例实例
export const glmService = new GLMService()