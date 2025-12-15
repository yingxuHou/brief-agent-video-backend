import mongoose, { Document, Schema } from 'mongoose'

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId
  username: string
  email: string
  password: string
  role: 'brand' | 'creator' | 'admin'
  profile: {
    firstName: string
    lastName: string
    avatar?: string
    phone?: string
    company?: string
    jobTitle?: string
  }
  preferences: {
    language: string
    timezone: string
    notifications: {
      email: boolean
      push: boolean
    }
  }
  subscription?: {
    plan: 'free' | 'basic' | 'professional' | 'enterprise'
    startDate: Date
    endDate?: Date
    status: 'active' | 'inactive' | 'cancelled'
  }
  stats: {
    projectsCount: number
    briefsCount: number
    totalSpent: number
  }
  isActive: boolean
  emailVerified: boolean
  lastLoginAt?: Date
  createdAt: Date
  updatedAt: Date
}

const userSchema = new Schema<IUser>({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    validate: {
      validator: function(v: string) {
        return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v)
      },
      message: 'Please enter a valid email address'
    }
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
    select: false // 默认查询时不返回密码
  },
  role: {
    type: String,
    enum: ['brand', 'creator', 'admin'],
    default: 'brand',
    required: true
  },
  profile: {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    avatar: {
      type: String,
      default: null
    },
    phone: {
      type: String,
      default: null
    },
    company: {
      type: String,
      default: null
    },
    jobTitle: {
      type: String,
      default: null
    }
  },
  preferences: {
    language: {
      type: String,
      default: 'zh-CN'
    },
    timezone: {
      type: String,
      default: 'Asia/Shanghai'
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      }
    }
  },
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'basic', 'professional', 'enterprise'],
      default: 'free'
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'cancelled'],
      default: 'active'
    }
  },
  stats: {
    projectsCount: {
      type: Number,
      default: 0
    },
    briefsCount: {
      type: Number,
      default: 0
    },
    totalSpent: {
      type: Number,
      default: 0
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  lastLoginAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password
      return ret
    }
  }
})

// 索引
userSchema.index({ email: 1 })
userSchema.index({ username: 1 })
userSchema.index({ role: 1 })
userSchema.index({ 'subscription.plan': 1 })
userSchema.index({ createdAt: -1 })

// 虚拟字段
userSchema.virtual('fullName').get(function() {
  return `${this.profile.firstName} ${this.profile.lastName}`
})

userSchema.virtual('isPremium').get(function() {
  return this.subscription?.plan !== 'free' && this.subscription?.status === 'active'
})

// 中间件
userSchema.pre('save', function(next) {
  if (this.isModified('lastLoginAt')) {
    this.lastLoginAt = new Date()
  }
  next()
})

// 静态方法
userSchema.statics.findByEmail = function(email: string) {
  return this.findOne({ email: email.toLowerCase() }).select('+password')
}

userSchema.statics.findByUsername = function(username: string) {
  return this.findOne({ username: username }).select('+password')
}

export const User = mongoose.model<IUser>('User', userSchema)