import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import rateLimit from 'express-rate-limit'
import morgan from 'morgan'
import { config } from 'dotenv'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

// 加载环境变量
config()

const app = express()
const PORT = process.env.PORT || 3001

// 基础中间件
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false
}))

app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || 'http://localhost:5173',
  credentials: process.env.CORS_CREDENTIALS === 'true',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}))

app.use(compression())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use(morgan('combined'))

// 速率限制
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: {
    success: false,
    message: '请求过于频繁，请稍后再试',
    code: 'RATE_LIMIT_EXCEEDED'
  }
})

app.use('/api', limiter)

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  })
})

// API信息
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'AI达人广告协创平台 API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      brief: '/api/brief'
    }
  })
})

// 简单的GLM测试接口
app.post('/api/test-glm', async (req, res) => {
  try {
    const { message = '请回复"API测试成功"' } = req.body

    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GLM_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'glm-4',
        messages: [
          {
            role: 'user',
            content: message
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    })

    const data = await response.json()

    res.json({
      success: true,
      data: {
        response: data.choices[0]?.message?.content || 'No response',
        usage: data.usage
      }
    })
  } catch (error) {
    console.error('GLM API Error:', error)
    res.status(500).json({
      success: false,
      message: 'GLM API调用失败',
      error: error.message
    })
  }
})

// 简单的用户注册接口
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password, role = 'brand', firstName, lastName } = req.body

    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI)

    // 简单的用户模型
    const userSchema = new mongoose.Schema({
      username: String,
      email: String,
      password: String,
      role: String,
      profile: {
        firstName: String,
        lastName: String
      },
      createdAt: { type: Date, default: Date.now }
    })

    const User = mongoose.models.User || mongoose.model('User', userSchema)

    // 检查用户是否已存在
    const existingUser = await User.findOne({ $or: [{ email }, { username }] })
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: '用户名或邮箱已存在'
      })
    }

    // 哈希密码
    const hashedPassword = await bcrypt.hash(password, 12)

    // 创建用户
    const user = new User({
      username,
      email,
      password: hashedPassword,
      role,
      profile: { firstName, lastName }
    })

    await user.save()

    // 生成JWT
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.status(201).json({
      success: true,
      message: '注册成功',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          profile: user.profile
        },
        token
      }
    })
  } catch (error) {
    console.error('Register Error:', error)
    res.status(500).json({
      success: false,
      message: '注册失败',
      error: error.message
    })
  }
})

// 简单的用户登录接口
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body

    await mongoose.connect(process.env.MONGODB_URI)

    const userSchema = new mongoose.Schema({
      username: String,
      email: String,
      password: String,
      role: String,
      profile: {
        firstName: String,
        lastName: String
      }
    }, { collection: 'users' })

    const User = mongoose.models.User || mongoose.model('User', userSchema)

    // 查找用户
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '邮箱或密码错误'
      })
    }

    // 验证密码
    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: '邮箱或密码错误'
      })
    }

    // 生成JWT
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({
      success: true,
      message: '登录成功',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          profile: user.profile
        },
        token
      }
    })
  } catch (error) {
    console.error('Login Error:', error)
    res.status(500).json({
      success: false,
      message: '登录失败',
      error: error.message
    })
  }
})

// AI Brief生成接口
app.post('/api/brief/generate', async (req, res) => {
  try {
    const {
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

    const systemPrompt = `你是一个专业的营销Brief专家，擅长为品牌方和达人创作高质量的营销Brief。请根据用户提供的信息，生成一个结构化、专业、可执行的营销Brief。

输出格式：
标题：[Brief标题]
项目概述：[简短的项目概述]
营销目标：[列出主要目标]
目标受众：[目标受众描述]
核心卖点：[列出核心卖点]
创意方向：[创意方向和执行建议]
交付要求：[具体交付要求]`

    const userPrompt = `请为以下项目生成营销Brief：

项目名称：${projectName}
品牌名称：${brandName}
产品：${product}
营销目标：${objectives.join(', ')}
目标受众：${targetAudience}
产品卖点：${sellingPoints}
传播诉求：${message}
内容类型：${contentType}
风格调性：${tone}
发布平台：${platforms.join(', ')}

请生成完整的营销Brief。`

    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GLM_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'glm-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    })

    const data = await response.json()
    const generatedContent = data.choices[0]?.message?.content

    // 简单解析生成内容
    const brief = {
      title: `${brandName} - ${projectName} Brief`,
      overview: `为${brandName}的${product}项目生成的营销Brief`,
      objectives: objectives,
      targetAudience: targetAudience,
      sellingPoints: sellingPoints.split('\n').filter(p => p.trim()),
      creativeDirection: `采用${tone}风格，针对${platforms.join('、')}平台`,
      deliverables: [
        `${platforms.length}个平台版本的${contentType}内容`,
        '配套文案和标签建议'
      ],
      generatedContent: generatedContent
    }

    res.json({
      success: true,
      message: 'Brief生成成功',
      data: {
        brief,
        generationTime: Date.now(),
        tokensUsed: data.usage?.total_tokens || 0
      }
    })
  } catch (error) {
    console.error('Brief Generation Error:', error)
    res.status(500).json({
      success: false,
      message: 'Brief生成失败',
      error: error.message
    })
  }
})

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: '接口不存在',
    code: 'ROUTE_NOT_FOUND'
  })
})

// 错误处理
app.use((error, req, res, next) => {
  console.error('Server Error:', error)
  res.status(500).json({
    success: false,
    message: '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  })
})

// 启动服务器
async function startServer() {
  try {
    // 测试数据库连接
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ MongoDB连接成功')

    app.listen(PORT, () => {
      console.log(`🚀 服务器运行在端口 ${PORT}`)
      console.log(`🌐 API地址: http://localhost:${PORT}/api`)
      console.log(`📊 健康检查: http://localhost:${PORT}/health`)
      console.log(`🤖 GLM测试: POST http://localhost:${PORT}/api/test-glm`)
    })
  } catch (error) {
    console.error('❌ 服务器启动失败:', error)
    process.exit(1)
  }
}

startServer()