import axios from 'axios'

// 简化的GLM测试脚本
async function testGLMAPI() {
  console.log('🚀 开始测试GLM-4.6 API...\n')

  const apiKey = '199b5e4a32c246e4b07a86b7d89d9eda.1uQV87dAiitaKJYY'
  const baseUrl = 'https://open.bigmodel.cn/api/paas/v4/'

  try {
    console.log('📡 测试API连接...')

    // 构建请求
    const response = await axios.post(
      `${baseUrl}/chat/completions`,
      {
        model: 'glm-4',
        messages: [
          {
            role: 'system',
            content: '你是一个专业的营销Brief专家。请用简洁专业的语言回复。'
          },
          {
            role: 'user',
            content: '请回复"连接成功"来确认API正常工作'
          }
        ],
        temperature: 0.7,
        max_tokens: 10
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    )

    console.log('✅ API连接成功!')
    console.log('📋 响应数据:', JSON.stringify(response.data, null, 2))

    // 测试完整的Brief生成
    console.log('\n🤖 测试Brief生成...')

    const briefResponse = await axios.post(
      `${baseUrl}/chat/completions`,
      {
        model: 'glm-4',
        messages: [
          {
            role: 'system',
            content: `你是一个专业的营销Brief专家，擅长为品牌方和达人创作高质量的营销Brief。

请根据用户提供的信息，生成一个结构化、专业、可执行的营销Brief。

输出格式如下：
标题：[Brief标题]
项目概述：[简短的项目概述]
营销目标：[列出主要目标]
目标受众：[目标受众描述]
核心卖点：[列出核心卖点]
创意方向：[创意方向和执行建议]
交付要求：[具体交付要求]`
          },
          {
            role: 'user',
            content: `请为以下项目生成营销Brief：

项目名称：春季保湿面霜推广
品牌名称：美妆品牌A
产品：深层保湿面霜
营销目标：品牌曝光、产品销售
目标受众：25-35岁女性，注重护肤品质，生活在一二线城市
产品卖点：天然成分、深层保湿、不油腻、适合敏感肌
传播诉求：让肌肤喝饱水，展现自然光泽
内容类型：短视频
风格调性：清新自然
发布平台：抖音、小红书

请生成完整的营销Brief。`
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000
      }
    )

    console.log('✅ Brief生成成功!')
    console.log('\n📝 生成的Brief内容:')
    console.log(briefResponse.data.choices[0].message.content)

  } catch (error: any) {
    console.error('\n❌ 测试失败:')

    if (error.response) {
      console.error('状态码:', error.response.status)
      console.error('响应数据:', JSON.stringify(error.response.data, null, 2))
    } else if (error.request) {
      console.error('网络错误:', error.message)
    } else {
      console.error('其他错误:', error.message)
    }
  }
}

// 运行测试
testGLMAPI()