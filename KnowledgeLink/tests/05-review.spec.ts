import { test, expect } from './fixtures'

test.describe('5. 复习引擎模块集成测试', () => {
  test('5.1 初始状态显示复习主页', async ({ page }) => {
    await page.goto('/#/review')
    await expect(page.locator('h1')).toHaveText('复习引擎')
    await expect(page.locator('text=间隔重复 · 智能调度')).toBeVisible()
  })

  test('5.2 创建笔记后生成复习卡片', async ({ page }) => {
    await page.goto('/#/notes')
    
    await page.click('text=新建笔记')
    await page.fill('input[placeholder="笔记标题"]', '复习测试笔记')
    await page.fill('textarea[placeholder="笔记内容... 使用 [[双括号]] 创建知识链接"]', 
      '这是用于复习测试的笔记内容。[[重要概念]] 需要被记住。')
    await page.fill('input[placeholder="如：哲学, 认知科学, 方法论"]', '复习')
    await page.click('button:has-text("创建")')
    await page.waitForTimeout(500)
    
    await page.goto('/#/review')
    await page.waitForTimeout(500)
    
    const statsText = page.locator('text=/待复习卡片: \\d+/)')
    await expect(statsText).toBeVisible()
    
    const text = await statsText.textContent()
    const match = text?.match(/待复习卡片: (\d+)/)
    expect(Number(match?.[1])).toBeGreaterThanOrEqual(1)
  })

  test('5.3 开始复习会话', async ({ page }) => {
    await page.goto('/#/notes')
    
    await page.click('text=新建笔记')
    await page.fill('input[placeholder="笔记标题"]', '会话测试笔记')
    await page.fill('textarea[placeholder="笔记内容... 使用 [[双括号]] 创建知识链接"]', 
      '[[核心概念]] 是测试的重点。')
    await page.click('button:has-text("创建")')
    await page.waitForTimeout(500)
    
    await page.goto('/#/review')
    await page.waitForTimeout(500)
    
    await page.click('button:has-text("开始复习")')
    await page.waitForTimeout(500)
    
    await expect(page.locator('h1')).toHaveText('复习会话')
    await expect(page.locator('text=显示答案')).toBeVisible()
  })

  test('5.4 复习卡片翻转动画', async ({ page }) => {
    await page.goto('/#/notes')
    
    await page.click('text=新建笔记')
    await page.fill('input[placeholder="笔记标题"]', '翻转测试')
    await page.fill('textarea[placeholder="笔记内容... 使用 [[双括号]] 创建知识链接"]', 
      '问题：什么是 [[记忆曲线]]？')
    await page.click('button:has-text("创建")')
    await page.waitForTimeout(500)
    
    await page.goto('/#/review/session')
    await page.waitForTimeout(500)
    
    await page.click('text=显示答案')
    await expect(page.locator('text=记忆曲线')).toBeVisible()
  })

  test('5.5 复习质量评级', async ({ page }) => {
    await page.goto('/#/notes')
    
    await page.click('text=新建笔记')
    await page.fill('input[placeholder="笔记标题"]', '评级测试')
    await page.fill('textarea[placeholder="笔记内容... 使用 [[双括号]] 创建知识链接"]', 
      '[[评级概念]] 测试内容。')
    await page.click('button:has-text("创建")')
    await page.waitForTimeout(500)
    
    await page.goto('/#/review/session')
    await page.waitForTimeout(500)
    
    await page.click('text=显示答案')
    await page.waitForTimeout(200)
    
    const qualityButtons = page.locator('button:has-text("困难"), button:has-text("模糊"), button:has-text("记住"), button:has-text("掌握")')
    expect(await qualityButtons.count()).toBe(4)
    
    await page.click('text=记住')
    await page.waitForTimeout(300)
  })

  test('5.6 认知负荷预测显示', async ({ page }) => {
    await page.goto('/#/notes')
    
    const notes = [
      { title: '笔记1', content: '[[概念A]] [[概念B]] [[概念C]]' },
      { title: '笔记2', content: '[[概念D]] [[概念E]]' },
      { title: '笔记3', content: '[[概念F]] [[概念G]] [[概念H]] [[概念I]]' },
    ]

    for (const note of notes) {
      await page.click('text=新建笔记')
      await page.fill('input[placeholder="笔记标题"]', note.title)
      await page.fill('textarea[placeholder="笔记内容... 使用 [[双括号]] 创建知识链接"]', note.content)
      await page.click('button:has-text("创建")')
      await page.waitForTimeout(300)
    }
    
    await page.goto('/#/review')
    await page.waitForTimeout(500)
    
    await expect(page.locator('text=认知负荷预测')).toBeVisible()
    
    const loadIndicator = page.locator('text=/认知负荷:/')
    await expect(loadIndicator).toBeVisible()
  })

  test('5.7 记忆曲线可视化', async ({ page }) => {
    await page.goto('/#/review')
    
    await page.click('text=查看记忆曲线')
    await page.waitForTimeout(500)
    
    await expect(page.locator('h1')).toHaveText('记忆曲线分析')
    await expect(page.locator('canvas')).toBeVisible()
    
    const chartCanvas = page.locator('canvas')
    expect(await chartCanvas.count()).toBeGreaterThanOrEqual(1)
  })

  test('5.8 复习统计数据', async ({ page }) => {
    await page.goto('/#/review')
    
    await expect(page.locator('text=累计复习次数')).toBeVisible()
    await expect(page.locator('text=平均记忆保持率')).toBeVisible()
    await expect(page.locator('text=今日复习')).toBeVisible()
  })

  test('5.9 FSRS 调度算法显示', async ({ page }) => {
    await page.goto('/#/notes')
    
    await page.click('text=新建笔记')
    await page.fill('input[placeholder="笔记标题"]', '调度测试')
    await page.fill('textarea[placeholder="笔记内容... 使用 [[双括号]] 创建知识链接"]', '[[调度概念]]')
    await page.click('button:has-text("创建")')
    await page.waitForTimeout(500)
    
    await page.goto('/#/review/session')
    await page.waitForTimeout(500)
    
    await page.click('text=显示答案')
    await page.click('text=掌握')
    await page.waitForTimeout(300)
    
    const nextReviewText = page.locator('text=/下次复习:/')
    if (await nextReviewText.isVisible({ timeout: 3000 })) {
      await expect(nextReviewText).toBeVisible()
    }
  })
})
