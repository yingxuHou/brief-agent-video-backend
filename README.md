# AI达人广告协创平台 - 后端服务

基于Node.js + Express.js + TypeScript的现代化后端服务，提供完整的用户认证、项目管理和AI集成功能。

## 🚀 技术栈

- **框架**: Node.js + Express.js
- **语言**: TypeScript
- **数据库**: MongoDB + Redis
- **认证**: JWT + bcrypt
- **验证**: express-validator
- **日志**: Winston
- **文档**: Swagger
- **测试**: Jest + Supertest

## 📦 项目结构

```
backend/
├── src/
│   ├── config/          # 配置文件
│   │   ├── database.ts  # MongoDB配置
│   │   └── redis.ts     # Redis配置
│   ├── controllers/     # 控制器
│   │   └── authController.ts
│   ├── middleware/      # 中间件
│   │   ├── auth.ts      # 认证中间件
│   │   ├── errorHandler.ts # 错误处理
│   │   └── validation.ts # 验证中间件
│   ├── models/          # 数据模型
│   │   ├── User.ts      # 用户模型
│   │   ├── Project.ts   # 项目模型
│   │   └── Brief.ts     # Brief模型
│   ├── routes/          # 路由
│   │   └── auth.ts      # 认证路由
│   ├── services/        # 业务服务
│   │   └── authService.ts
│   ├── utils/           # 工具函数
│   │   ├── auth.ts      # 认证工具
│   │   └── logger.ts    # 日志工具
│   └── index.ts         # 应用入口
├── uploads/             # 上传文件目录
├── logs/                # 日志目录
├── .env.example         # 环境变量示例
├── package.json
├── tsconfig.json
└── README.md
```

## 🛠️ 安装和运行

### 1. 环境要求

- Node.js >= 18.0.0
- MongoDB >= 5.0
- Redis >= 6.0

### 2. 安装依赖

```bash
cd backend
npm install
```

### 3. 配置环境变量

复制 `.env.example` 为 `.env` 并修改配置：

```bash
cp .env.example .env
```

主要配置项：
- `MONGODB_URI`: MongoDB连接字符串
- `REDIS_HOST`: Redis主机地址
- `JWT_SECRET`: JWT密钥
- `GLM_API_KEY`: AI服务API密钥

### 4. 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm run build
npm start
```

## 📚 API文档

### 认证接口

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/auth/register` | 用户注册 |
| POST | `/api/auth/login` | 用户登录 |
| POST | `/api/auth/logout` | 用户登出 |
| GET | `/api/auth/me` | 获取当前用户信息 |
| POST | `/api/auth/change-password` | 修改密码 |
| POST | `/api/auth/forgot-password` | 忘记密码 |
| POST | `/api/auth/reset-password` | 重置密码 |
| GET | `/api/auth/verify-email/:token` | 验证邮箱 |

### 请求示例

#### 用户注册
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123",
    "role": "brand",
    "firstName": "测试",
    "lastName": "用户"
  }'
```

#### 用户登录
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

## 🔐 认证机制

### JWT Token

系统使用JWT进行用户认证，包含两种token：

1. **Access Token**: 用于API访问，有效期7天
2. **Refresh Token**: 用于刷新token，有效期30天

### 请求头格式

```http
Authorization: Bearer <access_token>
```

### 用户角色

- `brand`: 品牌方用户
- `creator`: 达人创作者
- `admin`: 管理员

## 🗄️ 数据模型

### 用户模型 (User)

```typescript
interface IUser {
  username: string
  email: string
  password: string
  role: 'brand' | 'creator' | 'admin'
  profile: {
    firstName: string
    lastName: string
    avatar?: string
    company?: string
    jobTitle?: string
  }
  subscription: {
    plan: 'free' | 'basic' | 'professional' | 'enterprise'
    status: 'active' | 'inactive' | 'cancelled'
  }
  isActive: boolean
  emailVerified: boolean
  createdAt: Date
  updatedAt: Date
}
```

### 项目模型 (Project)

```typescript
interface IProject {
  name: string
  description: string
  brand: ObjectId
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
    user: ObjectId
    role: string
    status: 'invited' | 'accepted' | 'rejected'
    permissions: string[]
  }>
}
```

### Brief模型 (Brief)

```typescript
interface IBrief {
  title: string
  project: ObjectId
  brand: ObjectId
  content: {
    overview: string
    objectives: string[]
    targetAudience: string
    sellingPoints: string[]
    creativeDirection: string
    deliverables: string[]
  }
  generationInfo: {
    method: 'manual' | 'ai' | 'template'
    aiModel?: string
    generationTime: number
  }
  status: 'draft' | 'generated' | 'approved' | 'rejected' | 'in_progress' | 'completed'
}
```

## 🔧 开发指南

### 代码规范

项目使用ESLint和Prettier进行代码规范检查：

```bash
# 检查代码规范
npm run lint

# 自动修复代码规范
npm run lint:fix
```

### 测试

```bash
# 运行测试
npm test

# 运行测试并生成覆盖率报告
npm run test:coverage
```

### 构建

```bash
# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

## 📝 日志

系统使用Winston进行日志管理：

- **开发环境**: 输出到控制台和文件
- **生产环境**: 只输出到文件

日志级别：
- `error`: 错误信息
- `warn`: 警告信息
- `info`: 一般信息
- `debug`: 调试信息

## 🔐 安全特性

- 使用helmet进行安全头设置
- JWT token认证
- 密码哈希存储（bcrypt）
- 请求速率限制
- CORS跨域控制
- 输入验证和清理
- SQL注入防护（MongoDB注入防护）

## 📈 监控

### 健康检查

```bash
curl http://localhost:3000/health
```

### 性能监控

系统内置性能监控：
- API响应时间
- 内存使用情况
- 错误率统计
- 请求量统计

## 🚀 部署

### Docker部署

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### 环境变量

生产环境需要配置的环境变量：

```bash
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://mongo:27017/brief_agent_platform
REDIS_HOST=redis
JWT_SECRET=your-super-secret-jwt-key
```

## 🤝 贡献指南

1. Fork项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🆘 支持

如有问题，请通过以下方式联系：

- 邮箱: tech-support@example.com
- GitHub Issues
- 文档: https://docs.example.com