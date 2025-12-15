import { glmService } from '@/services/glmService.js'
import { connectDB } from '@/config/database.js'
import { logger } from '@/utils/logger.js'
import { config } from 'dotenv'

// 加载环境变量
config({ path: '../../../.env' })

async function testGLMService() {
  try {
    console.log('🚀 开始测试GLM-4.6服务...\n')

    // 测试连接
    console.log('📡 测试API连接...')
    const isConnected = await glmService.testConnection()
    console.log(isConnected ? '✅ 连接成功' : '❌ 连接失败')

    if (!isConnected) {
      console.log('\n❌ API连接失败，请检查API密钥')
      return
    }

    // 测试Brief生成
    console.log('\n🤖 测试Brief生成功能...')
    const testInput = {
      projectName: '春季新品推广',
      brandName: '美妆品牌A',
      product: '保湿面霜',
      objectives: ['品牌曝光', '产品销售'],
      targetAudience: '25-35岁女性，注重护肤品质，生活在一二线城市',
      sellingPoints: '天然成分、深层保湿、不油腻、适合敏感肌',
      message: '让肌肤喝饱水，展现自然光泽',
      contentType: 'video' as const,
      tone: '清新自然',
      platforms: ['douyin', 'xiaohongshu']
    }

    console.log('📝 输入参数:', JSON.stringify(testInput, null, 2))

    const startTime = Date.now()
    const result = await glmService.generateBrief(testInput)
    const generationTime = Date.now() - startTime

    console.log('\n✅ Brief生成成功!')
    console.log(`⏱️  生成耗时: ${generationTime}ms`)
    console.log('\n📋 生成结果:')
    console.log('标题:', result.title)
    console.log('\n项目概述:', result.overview)
    console.log('\n营销目标:', result.objectives)
    console.log('\n目标受众:', result.targetAudience)
    console.log('\n产品卖点:', result.sellingPoints)
    console.log('\n创意方向:', result.creativeDirection)
    console.log('\n交付要求:', result.deliverables)
    console.log('\n合规评分:', result.compliance.score)

  } catch (error) {
    console.error('\n❌ 测试失败:', error)
    logger.error('GLM Service Test Failed:', error)
  }
}

async function testCompleteFlow() {
  try {
    console.log('🔗 连接数据库...')
    await connectDB()

    await testGLMService()

  } catch (error) {
    console.error('\n❌ 完整流程测试失败:', error)
  } finally {
    console.log('\n🏁 测试完成')
    process.exit(0)
  }
}

// 运行测试
testCompleteFlow()