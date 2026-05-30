import { test, expect } from './fixtures'

test.describe('6. 成长仪表板模块集成测试', () => {
  test('6.1 初始状态显示仪表板', async ({ page }) => {
    await page.goto('/#/dashboard')
    await expect(page.locator('h1')).toHaveText('成长仪表板')
    await expect(page.locator('text=知识体系量化成长路径')).toBeVisible()
  })

  test('6.2 核心统计卡片显示', async ({ page }) => {
    await page.goto('/#/dashboard')
    
    const statCards = page.locator('div[class*="bg-surface rounded-xl border border-border"]').filter({
      has: page.locator('p:text("总藏书量")'),
    })
    
    await expect(page.locator('text=总藏书量')).toBeVisible()
    await expect(page.locator('text=笔记数量')).toBeVisible()
    await expect(page.locator('text=知识节点')).toBeVisible()
    await expect(page.locator('text=累计复习')).toBeVisible()
  })

  test('6.3 添加数据后仪表板统计更新', async ({ page }) => {
    await page.goto('/#/library')
    
    for (let i = 0; i < 3; i++) {
      await page.click('text=添加书籍')
      await page.fill('input[placeholder="输入书名"]', `书籍${i}`)
      await page.fill('input[placeholder="输入作者"]', `作者${i}`)
      await page.click('button:has-text("添加")')
      await page.waitForTimeout(300)
    }
    
    await page.goto('/#/notes')
    
    for (let i = 0; i < 4; i++) {
      await page.click('text=新建笔记')
      await page.fill('input[placeholder="笔记标题"]', `笔记${i}`)
      await page.fill('textarea[placeholder="笔记内容... 使用 [[双括号]] 创建知识链接"]', 
        `[[概念${i}]] [[概念${i + 10}]]`)
      await page.click('button:has-text("创建")')
      await page.waitForTimeout(300)
    }
    
    await page.goto('/#/dashboard')
    await page.waitForTimeout(500)
    
    const bookCount = page.locator('text=3', { hasText: '总藏书量' })
    await expect(page.locator('div:has-text("总藏书量")')).toContainText('3')
    
    const noteCount = page.locator('div:has-text("笔记数量")')
    await expect(noteCount).toContainText('4')
    
    const nodeCount = page.locator('div:has-text("知识节点")')
    const nodeText = await nodeCount.textContent()
    const nodeMatch = nodeText?.match(/(\d+)/)
    expect(Number(nodeMatch?.[0])).toBeGreaterThanOrEqual(8)
  })

  test('6.4 学习趋势图表', async ({ page }) => {
    await page.goto('/#/dashboard')
    
    await expect(page.locator('text=学习趋势')).toBeVisible()
    
    const trendCanvas = page.locator('canvas').first()
    expect(await trendCanvas.count()).toBe(1)
  })

  test('6.5 分类分布图表', async ({ page }) => {
    await page.goto('/#/library')
    
    const categories = ['哲学', '心理学', '计算机科学', '历史', '哲学', '计算机科学']
    
    for (let i = 0; i < categories.length; i++) {
      await page.click('text=添加书籍')
      await page.fill('input[placeholder="输入书名"]', `分类书籍${i}`)
      await page.fill('input[placeholder="输入作者"]', `作者${i}`)
      await page.fill('input[placeholder="如：哲学、计算机科学"]', categories[i])
      await page.click('button:has-text("添加")')
      await page.waitForTimeout(300)
    }
    
    await page.goto('/#/dashboard')
    await page.waitForTimeout(500)
    
    await expect(page.locator('text=分类分布')).toBeVisible()
    await expect(page.locator('text=哲学')).toBeVisible()
    await expect(page.locator('text=心理学')).toBeVisible()
    await expect(page.locator('text=计算机科学')).toBeVisible()
    await expect(page.locator('text=历史')).toBeVisible()
    
    const categoryCounts = page.locator('div:has-text("哲学") span')
    expect(await categoryCounts.count()).toBeGreaterThanOrEqual(1)
  })

  test('6.6 知识网络密度指标', async ({ page }) => {
    await page.goto('/#/notes')
    
    for (let i = 0; i < 5; i++) {
      await page.click('text=新建笔记')
      await page.fill('input[placeholder="笔记标题"]', `网络笔记${i}`)
      await page.fill('textarea[placeholder="笔记内容... 使用 [[双括号]] 创建知识链接"]', 
        `[[节点${i}]] [[节点${i + 1}]] [[节点${i + 2}]]`)
      await page.click('button:has-text("创建")')
      await page.waitForTimeout(300)
    }
    
    await page.goto('/#/dashboard')
    await page.waitForTimeout(500)
    
    await expect(page.locator('text=知识网络密度')).toBeVisible()
    
    const densityText = page.locator('text=/网络密度:/')
    await expect(densityText).toBeVisible()
  })

  test('6.7 学习时长统计', async ({ page }) => {
    await page.goto('/#/dashboard')
    
    await expect(page.locator('text=本周学习时长')).toBeVisible()
    await expect(page.locator('text=连续学习天数')).toBeVisible()
    
    const streakText = page.locator('text=/连续学习天数/)')
    await expect(streakText).toBeVisible()
  })

  test('6.8 成就徽章系统', async ({ page }) => {
    await page.goto('/#/dashboard')
    
    await expect(page.locator('text=成就徽章')).toBeVisible()
    
    const badges = page.locator('div[class*="bg-accent/10"]')
    expect(await badges.count()).toBeGreaterThanOrEqual(1)
  })

  test('6.9 近期活动记录', async ({ page }) => {
    await page.goto('/#/notes')
    
    await page.click('text=新建笔记')
    await page.fill('input[placeholder="笔记标题"]', '活动测试笔记')
    await page.fill('textarea[placeholder="笔记内容... 使用 [[双括号]] 创建知识链接"]', '[[活动概念]]')
    await page.click('button:has-text("创建")')
    await page.waitForTimeout(500)
    
    await page.goto('/#/dashboard')
    await page.waitForTimeout(500)
    
    await expect(page.locator('text=近期活动')).toBeVisible()
    
    const activityItems = page.locator('div[class*="border-b border-border/50"]')
    expect(await activityItems.count()).toBeGreaterThanOrEqual(1)
    
    await expect(page.locator('text=创建笔记: 活动测试笔记')).toBeVisible()
  })

  test('6.10 学习目标进度', async ({ page }) => {
    await page.goto('/#/dashboard')
    
    await expect(page.locator('text=本月目标')).toBeVisible()
    
    const goalProgress = page.locator('div[class*="h-full bg-gradient-to-r from-accent"]')
    expect(await goalProgress.count()).toBeGreaterThanOrEqual(1)
  })
})
