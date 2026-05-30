import { test, expect } from './fixtures'

test.describe('7. 跨模块数据增量对齐集成测试', () => {
  test('7.1 笔记→知识图谱增量对齐', async ({ page }) => {
    await page.goto('/#/notes')
    
    await page.click('text=新建笔记')
    await page.fill('input[placeholder="笔记标题"]', '对齐测试1')
    await page.fill('textarea[placeholder="笔记内容... 使用 [[双括号]] 创建知识链接"]', 
      '[[认知心理学]] [[行为经济学]] [[神经科学]]')
    await page.click('button:has-text("创建")')
    await page.waitForTimeout(500)
    
    await page.goto('/#/graph')
    await page.waitForTimeout(500)
    
    const stats = page.locator('text=/\\d+ 个节点 · \\d+ 条边/')
    const text = await stats.textContent()
    const nodeMatch = text?.match(/(\d+) 个节点/)
    expect(Number(nodeMatch?.[1])).toBe(3)
  })

  test('7.2 笔记编辑→知识图谱增量更新', async ({ page }) => {
    await page.goto('/#/notes')
    
    await page.click('text=新建笔记')
    await page.fill('input[placeholder="笔记标题"]', '动态对齐测试')
    await page.fill('textarea[placeholder="笔记内容... 使用 [[双括号]] 创建知识链接"]', 
      '[[初始概念]]')
    await page.click('button:has-text("创建")')
    await page.waitForTimeout(500)
    
    await page.goto('/#/graph')
    await page.waitForTimeout(500)
    const initialText = await page.locator('text=/\\d+ 个节点/').textContent()
    const initialNodes = Number(initialText?.match(/(\d+) 个节点/)?.[1] || 0)
    
    await page.goto('/#/notes')
    await page.click('text=动态对齐测试')
    await page.fill('textarea', '[[初始概念]] [[新增概念1]] [[新增概念2]] [[新增概念3]]')
    await page.click('button:has-text("保存")')
    await page.waitForTimeout(500)
    
    await page.goto('/#/graph')
    await page.waitForTimeout(500)
    const updatedText = await page.locator('text=/\\d+ 个节点/').textContent()
    const updatedNodes = Number(updatedText?.match(/(\d+) 个节点/)?.[1] || 0)
    
    expect(updatedNodes).toBe(initialNodes + 3)
  })

  test('7.3 笔记→复习引擎卡片生成', async ({ page }) => {
    await page.goto('/#/notes')
    
    await page.click('text=新建笔记')
    await page.fill('input[placeholder="笔记标题"]', '复习卡片测试')
    await page.fill('textarea[placeholder="笔记内容... 使用 [[双括号]] 创建知识链接"]', 
      '[[核心概念A]] [[核心概念B]]')
    await page.click('button:has-text("创建")')
    await page.waitForTimeout(500)
    
    await page.goto('/#/review')
    await page.waitForTimeout(500)
    
    const pendingText = page.locator('text=/待复习卡片: \\d+/')
    const text = await pendingText.textContent()
    const match = text?.match(/待复习卡片: (\d+)/)
    expect(Number(match?.[1])).toBeGreaterThanOrEqual(2)
  })

  test('7.4 阅读库→仪表板数据同步', async ({ page }) => {
    await page.goto('/#/library')
    
    const books = [
      { title: '哲学导论', category: '哲学' },
      { title: '心理学原理', category: '心理学' },
      { title: '算法导论', category: '计算机科学' },
      { title: '西方哲学史', category: '哲学' },
      { title: '认知心理学', category: '心理学' },
    ]

    for (const book of books) {
      await page.click('text=添加书籍')
      await page.fill('input[placeholder="输入书名"]', book.title)
      await page.fill('input[placeholder="如：哲学、计算机科学"]', book.category)
      await page.click('button:has-text("添加")')
      await page.waitForTimeout(300)
    }
    
    await page.goto('/#/dashboard')
    await page.waitForTimeout(500)
    
    const bookCountDiv = page.locator('div:has-text("总藏书量")')
    await expect(bookCountDiv).toContainText('5')
    
    await expect(page.locator('text=哲学')).toBeVisible()
    await expect(page.locator('text=心理学')).toBeVisible()
    await expect(page.locator('text=计算机科学')).toBeVisible()
  })

  test('7.5 全链路数据流转测试', async ({ page }) => {
    await page.goto('/#/library')
    
    await page.click('text=添加书籍')
    await page.fill('input[placeholder="输入书名"]', '《深度学习》')
    await page.fill('input[placeholder="输入作者"]', 'Ian Goodfellow')
    await page.fill('input[placeholder="如：哲学、计算机科学"]', '计算机科学')
    await page.fill('input[placeholder="1"]', '21')
    await page.click('button:has-text("添加")')
    await page.waitForTimeout(500)
    
    await page.goto('/#/notes')
    
    await page.click('text=新建笔记')
    await page.fill('input[placeholder="笔记标题"]', '深度学习笔记')
    await page.fill('textarea[placeholder="笔记内容... 使用 [[双括号]] 创建知识链接"]', 
      '[[神经网络]] 是 [[深度学习]] 的基础，[[反向传播]] 是训练 [[神经网络]] 的核心算法。[[机器学习]] 是 [[人工智能]] 的子领域。')
    await page.fill('input[placeholder="如：哲学, 认知科学, 方法论"]', '深度学习, 人工智能')
    await page.click('button:has-text("创建")')
    await page.waitForTimeout(1000)
    
    await page.goto('/#/graph')
    await page.waitForTimeout(1000)
    
    const graphStats = page.locator('text=/\\d+ 个节点 · \\d+ 条边/')
    const graphText = await graphStats.textContent()
    const nodeMatch = graphText?.match(/(\d+) 个节点/)
    const edgeMatch = graphText?.match(/(\d+) 条边/)
    expect(Number(nodeMatch?.[1])).toBeGreaterThanOrEqual(5)
    expect(Number(edgeMatch?.[1])).toBeGreaterThanOrEqual(4)
    
    await page.goto('/#/review')
    await page.waitForTimeout(500)
    
    const reviewStats = page.locator('text=/待复习卡片: \\d+/')
    const reviewText = await reviewStats.textContent()
    const reviewMatch = reviewText?.match(/待复习卡片: (\d+)/)
    expect(Number(reviewMatch?.[1])).toBeGreaterThanOrEqual(5)
    
    await page.goto('/#/dashboard')
    await page.waitForTimeout(500)
    
    await expect(page.locator('div:has-text("总藏书量")')).toContainText('1')
    await expect(page.locator('div:has-text("笔记数量")')).toContainText('1')
    
    const nodeCountDiv = page.locator('div:has-text("知识节点")')
    const nodeCountText = await nodeCountDiv.textContent()
    const nodeCount = nodeCountText?.match(/(\d+)/)
    expect(Number(nodeCount?.[0])).toBeGreaterThanOrEqual(5)
  })

  test('7.6 离线数据持久化验证', async ({ page }) => {
    await page.goto('/#/notes')
    
    await page.click('text=新建笔记')
    await page.fill('input[placeholder="笔记标题"]', '持久化测试')
    await page.fill('textarea[placeholder="笔记内容... 使用 [[双括号]] 创建知识链接"]', 
      '[[持久化概念]]')
    await page.click('button:has-text("创建")')
    await page.waitForTimeout(500)
    
    await page.reload()
    await page.waitForTimeout(500)
    
    await expect(page.locator('text=持久化测试')).toBeVisible()
    await expect(page.locator('text=共 1 条笔记')).toBeVisible()
  })

  test('7.7 全文搜索跨模块验证', async ({ page }) => {
    await page.goto('/#/notes')
    
    const notes = [
      { title: '机器学习入门', content: '[[机器学习]] 是 [[人工智能]] 的核心' },
      { title: '深度学习进阶', content: '[[深度学习]] 是 [[机器学习]] 的分支' },
      { title: '强化学习基础', content: '[[强化学习]] 是 [[机器学习]] 的重要领域' },
    ]

    for (const note of notes) {
      await page.click('text=新建笔记')
      await page.fill('input[placeholder="笔记标题"]', note.title)
      await page.fill('textarea[placeholder="笔记内容... 使用 [[双括号]] 创建知识链接"]', note.content)
      await page.click('button:has-text("创建")')
      await page.waitForTimeout(300)
    }
    
    await page.fill('input[placeholder="搜索笔记..."]', '机器学习')
    await page.waitForTimeout(200)
    
    const noteCards = page.locator('a[href^="#/notes/"]')
    expect(await noteCards.count()).toBe(3)
    
    await page.fill('input[placeholder="搜索笔记..."]', '深度学习')
    await page.waitForTimeout(200)
    expect(await noteCards.count()).toBe(1)
  })

  test('7.8 认知负荷预测与复习调度联动', async ({ page }) => {
    await page.goto('/#/notes')
    
    await page.click('text=新建笔记')
    await page.fill('input[placeholder="笔记标题"]', '高负荷笔记')
    await page.fill('textarea[placeholder="笔记内容... 使用 [[双括号]] 创建知识链接"]', 
      '[[概念A]] [[概念B]] [[概念C]] [[概念D]] [[概念E]] [[概念F]]')
    await page.click('button:has-text("创建")')
    await page.waitForTimeout(500)
    
    await page.click('text=新建笔记')
    await page.fill('input[placeholder="笔记标题"]', '低负荷笔记')
    await page.fill('textarea[placeholder="笔记内容... 使用 [[双括号]] 创建知识链接"]', 
      '[[简单概念]]')
    await page.click('button:has-text("创建")')
    await page.waitForTimeout(500)
    
    await page.goto('/#/review')
    await page.waitForTimeout(500)
    
    await expect(page.locator('text=认知负荷预测')).toBeVisible()
    
    const loadText = page.locator('text=/认知负荷:/')
    await expect(loadText).toBeVisible()
  })
})
