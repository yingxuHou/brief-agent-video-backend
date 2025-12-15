import mongoose, { Document, Schema } from 'mongoose'
import { IProject } from './Project'
import { IUser } from './User'

export interface IBrief extends Document {
  _id: mongoose.Types.ObjectId
  title: string
  project: mongoose.Types.ObjectId // 引用Project
  brand: mongoose.Types.ObjectId // 引用User (brand role)
  creator?: mongoose.Types.ObjectId // 引用User (creator role) - 如果指定给特定达人

  // Brief内容
  content: {
    overview: string
    objectives: string[]
    targetAudience: string
    sellingPoints: string[]
    message: string
    creativeDirection: string
    deliverables: string[]
    restrictions: string[]
    examples: Array<{
      type: 'image' | 'video' | 'text'
      url: string
      description: string
    }>
  }

  // 生成信息
  generationInfo: {
    method: 'manual' | 'ai' | 'template'
    templateId?: mongoose.Types.ObjectId
    aiModel?: string
    prompt?: string
    generationTime: number // 生成耗时(ms)
    tokens?: number // AI使用的token数
  }

  // 文件附件
  attachments: Array<{
    filename: string
    originalName: string
    mimeType: string
    size: number
    url: string
    uploadedAt: Date
  }>

  // 状态管理
  status: 'draft' | 'generated' | 'approved' | 'rejected' | 'in_progress' | 'completed'
  priority: 'low' | 'medium' | 'high' | 'urgent'

  // 协作信息
  collaboration: {
    assignedTo: mongoose.Types.ObjectId[] // 分配的达人们
    feedback: Array<{
      user: mongoose.Types.ObjectId
      content: string
      rating: number // 1-5星
      createdAt: Date
    }>
    versions: Array<{
      version: number
      content: any // 保存历史内容
      modifiedBy: mongoose.Types.ObjectId
      modifiedAt: Date
      changeDescription: string
    }>
  }

  // 平台适配
  platformAdaptations: Array<{
    platform: 'douyin' | 'xiaohongshu' | 'weibo' | 'wechat' | 'bilibili' | 'kuaishou'
    adaptations: {
      title?: string
      description?: string
      hashtags?: string[]
      duration?: number // 视频时长(秒)
      format?: string // 画幅比例
      specs?: Record<string, any>
    }
  }>

  // AI分析结果
  aiAnalysis: {
    sentiment: 'positive' | 'neutral' | 'negative'
    complexity: 'low' | 'medium' | 'high'
    compliance: {
      score: number // 0-100合规分数
      issues: Array<{
        type: 'sensitive_word' | 'policy_violation' | 'brand_risk'
        severity: 'low' | 'medium' | 'high'
        description: string
        suggestion: string
      }>
    }
    predictions: {
      engagement: number // 预估互动率
      conversion: number // 预估转化率
      reach: number // 预估触达人数
    }
  }

  // 标签和分类
  tags: string[]
  category: string
  industry: string

  // 元数据
  metadata: {
    createdAt: Date
    updatedAt: Date
    createdBy: mongoose.Types.ObjectId
    lastModifiedBy?: mongoose.Types.ObjectId
    publishedAt?: Date
    completedAt?: Date
  }
}

const briefSchema = new Schema<IBrief>({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  project: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  brand: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  creator: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },

  content: {
    overview: {
      type: String,
      required: true,
      maxlength: 2000
    },
    objectives: [{
      type: String,
      required: true
    }],
    targetAudience: {
      type: String,
      required: true,
      maxlength: 1000
    },
    sellingPoints: [{
      type: String,
      required: true
    }],
    message: {
      type: String,
      required: true,
      maxlength: 1000
    },
    creativeDirection: {
      type: String,
      required: true,
      maxlength: 2000
    },
    deliverables: [{
      type: String,
      required: true
    }],
    restrictions: [{
      type: String
    }],
    examples: [{
      type: {
        type: String,
        enum: ['image', 'video', 'text'],
        required: true
      },
      url: {
        type: String,
        required: true
      },
      description: {
        type: String,
        required: true
      }
    }]
  },

  generationInfo: {
    method: {
      type: String,
      enum: ['manual', 'ai', 'template'],
      default: 'manual'
    },
    templateId: {
      type: Schema.Types.ObjectId,
      ref: 'Template'
    },
    aiModel: {
      type: String
    },
    prompt: {
      type: String
    },
    generationTime: {
      type: Number,
      default: 0
    },
    tokens: {
      type: Number
    }
  },

  attachments: [{
    filename: String,
    originalName: String,
    mimeType: String,
    size: Number,
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],

  status: {
    type: String,
    enum: ['draft', 'generated', 'approved', 'rejected', 'in_progress', 'completed'],
    default: 'draft'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },

  collaboration: {
    assignedTo: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }],
    feedback: [{
      user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      content: {
        type: String,
        required: true
      },
      rating: {
        type: Number,
        min: 1,
        max: 5,
        required: true
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    versions: [{
      version: {
        type: Number,
        required: true
      },
      content: {
        type: Schema.Types.Mixed,
        required: true
      },
      modifiedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      modifiedAt: {
        type: Date,
        default: Date.now
      },
      changeDescription: {
        type: String,
        required: true
      }
    }]
  },

  platformAdaptations: [{
    platform: {
      type: String,
      enum: ['douyin', 'xiaohongshu', 'weibo', 'wechat', 'bilibili', 'kuaishou'],
      required: true
    },
    adaptations: {
      title: String,
      description: String,
      hashtags: [String],
      duration: Number,
      format: String,
      specs: {
        type: Schema.Types.Mixed,
        default: {}
      }
    }
  }],

  aiAnalysis: {
    sentiment: {
      type: String,
      enum: ['positive', 'neutral', 'negative'],
      default: 'neutral'
    },
    complexity: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    compliance: {
      score: {
        type: Number,
        min: 0,
        max: 100,
        default: 100
      },
      issues: [{
        type: {
          type: String,
          enum: ['sensitive_word', 'policy_violation', 'brand_risk'],
          required: true
        },
        severity: {
          type: String,
          enum: ['low', 'medium', 'high'],
          required: true
        },
        description: {
          type: String,
          required: true
        },
        suggestion: {
          type: String,
          required: true
        }
      }]
    },
    predictions: {
      engagement: {
        type: Number,
        default: 0
      },
      conversion: {
        type: Number,
        default: 0
      },
      reach: {
        type: Number,
        default: 0
      }
    }
  },

  tags: [{
    type: String,
    trim: true
  }],
  category: {
    type: String,
    trim: true
  },
  industry: {
    type: String,
    trim: true
  },

  metadata: {
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    lastModifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    publishedAt: {
      type: Date
    },
    completedAt: {
      type: Date
    }
  }
}, {
  timestamps: true
})

// 索引
briefSchema.index({ project: 1, status: 1 })
briefSchema.index({ brand: 1, status: 1 })
briefSchema.index({ 'collaboration.assignedTo': 1 })
briefSchema.index({ status: 1, priority: -1 })
briefSchema.index({ tags: 1 })
briefSchema.index({ category: 1 })
briefSchema.index({ industry: 1 })
briefSchema.index({ createdAt: -1 })

// 虚拟字段
briefSchema.virtual('isActive').get(function() {
  return !['draft', 'rejected', 'completed'].includes(this.status)
})

briefSchema.virtual('isOverdue').get(function() {
  // 可以基于项目时间线判断
  return false // 简化实现
})

briefSchema.virtual('averageRating').get(function() {
  if (this.collaboration.feedback.length === 0) return 0
  const total = this.collaboration.feedback.reduce((sum, f) => sum + f.rating, 0)
  return Math.round((total / this.collaboration.feedback.length) * 100) / 100
})

briefSchema.virtual('complianceScore').get(function() {
  return this.aiAnalysis.compliance.score
})

// 静态方法
briefSchema.statics.findByBrand = function(brandId: mongoose.Types.ObjectId) {
  return this.find({ brand: brandId }).populate('project', 'name').populate('creator', 'username profile')
}

briefSchema.statics.findByCreator = function(creatorId: mongoose.Types.ObjectId) {
  return this.find({ 'collaboration.assignedTo': creatorId }).populate('project', 'name').populate('brand', 'username profile')
}

briefSchema.statics.findByProject = function(projectId: mongoose.Types.ObjectId) {
  return this.find({ project: projectId }).populate('brand', 'username profile').populate('creator', 'username profile')
}

export const Brief = mongoose.model<IBrief>('Brief', briefSchema)