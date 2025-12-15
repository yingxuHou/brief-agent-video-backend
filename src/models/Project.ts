import mongoose, { Document, Schema } from 'mongoose'
import { IUser } from './User'

export interface IProject extends Document {
  _id: mongoose.Types.ObjectId
  name: string
  description: string
  brand: mongoose.Types.ObjectId // 引用User (brand role)
  status: 'draft' | 'active' | 'completed' | 'paused' | 'cancelled'
  settings: {
    industry: string
    targetAudience: string
    objectives: string[]
    platforms: string[]
    budget: {
      min: number
      max: number
      currency: string
    }
    timeline: {
      startDate: Date
      endDate: Date
    }
  }
  collaborators: Array<{
    user: mongoose.Types.ObjectId // 引用User (creator role)
    role: string
    status: 'invited' | 'accepted' | 'rejected'
    invitedAt: Date
    joinedAt?: Date
    permissions: string[]
  }>
  briefs: mongoose.Types.ObjectId[] // 引用Brief模型
  deliverables: Array<{
    type: 'video' | 'image' | 'text' | 'live'
    quantity: number
    specifications: Record<string, any>
    completed: number
  }>
  analytics: {
    views: number
    engagements: number
    shares: number
    conversions: number
    revenue: number
    lastUpdated: Date
  }
  tags: string[]
  isPublic: boolean
  createdAt: Date
  updatedAt: Date
}

const projectSchema = new Schema<IProject>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    maxlength: 1000
  },
  brand: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'completed', 'paused', 'cancelled'],
    default: 'draft'
  },
  settings: {
    industry: {
      type: String,
      required: true
    },
    targetAudience: {
      type: String,
      required: true
    },
    objectives: [{
      type: String,
      required: true
    }],
    platforms: [{
      type: String,
      enum: ['douyin', 'xiaohongshu', 'weibo', 'wechat', 'bilibili', 'kuaishou'],
      required: true
    }],
    budget: {
      min: {
        type: Number,
        required: true,
        min: 0
      },
      max: {
        type: Number,
        required: true,
        min: 0
      },
      currency: {
        type: String,
        default: 'CNY'
      }
    },
    timeline: {
      startDate: {
        type: Date,
        required: true
      },
      endDate: {
        type: Date,
        required: true
      }
    }
  },
  collaborators: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['invited', 'accepted', 'rejected'],
      default: 'invited'
    },
    invitedAt: {
      type: Date,
      default: Date.now
    },
    joinedAt: {
      type: Date,
      default: null
    },
    permissions: [{
      type: String
    }]
  }],
  briefs: [{
    type: Schema.Types.ObjectId,
    ref: 'Brief'
  }],
  deliverables: [{
    type: {
      type: String,
      enum: ['video', 'image', 'text', 'live'],
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    specifications: {
      type: Schema.Types.Mixed,
      default: {}
    },
    completed: {
      type: Number,
      default: 0,
      min: 0
    }
  }],
  analytics: {
    views: {
      type: Number,
      default: 0
    },
    engagements: {
      type: Number,
      default: 0
    },
    shares: {
      type: Number,
      default: 0
    },
    conversions: {
      type: Number,
      default: 0
    },
    revenue: {
      type: Number,
      default: 0
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  tags: [{
    type: String,
    trim: true
  }],
  isPublic: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
})

// 索引
projectSchema.index({ brand: 1, status: 1 })
projectSchema.index({ 'collaborators.user': 1 })
projectSchema.index({ 'settings.industry': 1 })
projectSchema.index({ 'settings.platforms': 1 })
projectSchema.index({ createdAt: -1 })
projectSchema.index({ tags: 1 })

// 虚拟字段
projectSchema.virtual('isActive').get(function() {
  return this.status === 'active'
})

projectSchema.virtual('progress').get(function() {
  if (this.deliverables.length === 0) return 0
  const totalDeliverables = this.deliverables.reduce((sum, d) => sum + d.quantity, 0)
  const completedDeliverables = this.deliverables.reduce((sum, d) => sum + d.completed, 0)
  return Math.round((completedDeliverables / totalDeliverables) * 100)
})

projectSchema.virtual('isOverdue').get(function() {
  return new Date() > this.settings.timeline.endDate && this.status !== 'completed'
})

// 静态方法
projectSchema.statics.findByBrand = function(brandId: mongoose.Types.ObjectId) {
  return this.find({ brand: brandId }).populate('brand', 'username email profile')
}

projectSchema.statics.findByCollaborator = function(userId: mongoose.Types.ObjectId) {
  return this.find({ 'collaborators.user': userId }).populate('brand', 'username email profile')
}

export const Project = mongoose.model<IProject>('Project', projectSchema)