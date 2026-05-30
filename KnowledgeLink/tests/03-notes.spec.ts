import { test, expect } from './fixtures'

test.describe('3. 笔记系统模块集成测试', () => {
  test('3.1 初始状态显示空状态', async ({ page }) => {
    await page.goto('/#/notes')
    await expect(page.locator('text=共 0 条笔记')).toBeVisible()
    await expect(page.locator('text=新建笔记')).toBeVisible()
  })

  test('3.2 新建笔记流程', async ({ page, testData }) => {
    await page.goto('/#/notes')
    
    await page.click('text=新建笔记')
    await expect(page.locator('text=新建笔记')).nth(1).toBeVisible()
    
    await page.fill('input[placeholder="笔记标题"]', '我的第一篇笔记')
    await page.fill('textarea[placeholder="笔记内容... 使用 [[双括号]] 创建知识链接"]', 
      '这是笔记的正文内容，包含一些重要的概念。')
    await page.fill('input[placeholder="如：哲学, 认知科学, 方法论"]', '学习, 笔记')
    
    await page.click('button:has-text("创建")')
    
    await expect(page.locator('text=✓ 已创建')).toBeVisible()
    await expect(page.locator('text=我的第一篇笔记')).toBeVisible()
    await expect(page.locator('text=共 1 条笔记')).toBeVisible()
  })

  test('3.3 新建笔记带知识链接', async ({ page, testData }) => {
    await page.goto('/#/notes')
    
    await page.click('text=新建笔记')
    
    await page.fill('input[placeholder="笔记标题"]', '认知科学入门')
    await page.fill('textarea[placeholder="笔记内容... 使用 [[双括号]] 创建知识链接"]', 
      '学习 [[认知科学]] 需要了解 [[心理学]] 和 [[神经科学]] 的基础知识。')
    await page.fill('input[placeholder="如：哲学, 认知科学, 方法论"]', '认知科学')
    
    await page.click('button:has-text("创建")')
    
    await expect(page.locator('text=认知科学入门')).toBeVisible()
    
    await page.click('text=认知科学入门')
    await expect(page.locator('h1')).toBeVisible()
    
    await expect(page.locator('text=[[认知科学]]')).toBeVisible()
    await expect(page.locator('text=[[心理学]]')).toBeVisible()
    await expect(page.locator('text=[[神经科学]]')).toBeVisible()
  })

  test('3.4 编辑已保存的笔记并验证保存提示', async ({ page }) => {
    await page.goto('/#/notes')
    
    await page.click('text=新建笔记')
    await page.fill('input[placeholder="笔记标题"]', '待编辑笔记')
    await page.fill('textarea[placeholder="笔记内容... 使用 [[双括号]] 创建知识链接"]', 
      '初始内容')
    await page.click('button:has-text("创建")')
    await page.waitForTimeout(500)
    
    await page.click('text=待编辑笔记')
    await expect(page.locator('button:has-text("保存")')).toBeVisible()
    
    await page.fill('textarea', '修改后的内容，包含 [[新概念]] 链接')
    await page.click('button:has-text("保存")')
    
    await expect(page.locator('text=✓ 已保存')).toBeVisible()
    await page.waitForTimeout(2500)
    await expect(page.locator('text=✓ 已保存')).not.toBeVisible()
  })

  test('3.5 笔记标签系统', async ({ page }) => {
    await page.goto('/#/notes')
    
    const notes = [
      { title: '笔记1', content: '内容1', tags: '哲学' },
      { title: '笔记2', content: '内容2', tags: '哲学, 认知科学' },
      { title: '笔记3', content: '内容3', tags: '技术' },
    ]

    for (const note of notes) {
      await page.click('text=新建笔记')
      await page.fill('input[placeholder="笔记标题"]', note.title)
      await page.fill('textarea[placeholder="笔记内容... 使用 [[双括号]] 创建知识链接"]', note.content)
      await page.fill('input[placeholder="如：哲学, 认知科学, 方法论"]', note.tags)
      await page.click('button:has-text("创建")')
      await page.waitForTimeout(300)
    }

    const allTags = page.locator('.flex.flex-wrap.gap-1 button')
    expect(await allTags.count()).toBeGreaterThanOrEqual(3)
    
    await page.click('text=哲学')
    await page.waitForTimeout(200)
    
    const filteredNotes = page.locator('a[href^="#/notes/"]')
    expect(await filteredNotes.count()).toBe(2)
  })

  test('3.6 笔记搜索功能', async ({ page }) => {
    await page.goto('/#/notes')
    
    const notes = [
      { title: '人工智能综述', content: '机器学习是人工智能的核心' },
      { title: '机器学习基础', content: '深度学习是机器学习的分支' },
      { title: '哲学思考', content: '关于存在的思考' },
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
    expect(await noteCards.count()).toBe(2)
    
    await page.fill('input[placeholder="搜索笔记..."]', '哲学')
    await page.waitForTimeout(200)
    expect(await noteCards.count()).toBe(1)
  })

  test('3.7 笔记删除功能', async ({ page }) => {
    await page.goto('/#/notes')
    
    await page.click('text=新建笔记')
    await page.fill('input[placeholder="笔记标题"]', '待删除笔记')
    await page.fill('textarea[placeholder="笔记内容... 使用 [[双括号]] 创建知识链接"]', '内容')
    await page.click('button:has-text("创建")')
    await page.waitForTimeout(500)
    
    await page.click('text=待删除笔记')
    await expect(page.locator('button:has-text("保存")')).toBeVisible()
    
    await page.click('button[class*="text-danger"]')
    
    await expect(page.locator('text=共 0 条笔记')).toBeVisible()
    await expect(page.locator('text=待删除笔记')).not.toBeVisible()
  })

  test('3.8 双向链接建议浮窗', async ({ page }) => {
    await page.goto('/#/notes')
    
    await page.click('text=新建笔记')
    await page.fill('input[placeholder="笔记标题"]', '目标笔记')
    await page.click('button:has-text("创建")')
    await page.waitForTimeout(300)
    
    await page.click('text=新建笔记')
    await page.fill('input[placeholder="笔记标题"]', '引用笔记')
    
    const textarea = page.locator('textarea[placeholder="笔记内容... 使用 [[双括号]] 创建知识链接"]')
    await textarea.fill('这是 [[')
    await page.waitForTimeout(300)
    
    await expect(page.locator('text=关联笔记')).toBeVisible()
    await expect(page.locator('text=目标笔记')).toBeVisible()
  })

  test('3.9 笔记列表视图切换', async ({ page }) => {
    await page.goto('/#/notes')
    
    await page.click('text=新建笔记')
    await page.fill('input[placeholder="笔记标题"]', '测试笔记')
    await page.click('button:has-text("创建")')
    await page.waitForTimeout(300)
    
    const gridButton = page.locator('button[class*="p-2.5"]').first()
    const listButton = page.locator('button[class*="p-2.5"]').nth(1)
    
    await listButton.click()
    await page.waitForTimeout(200)
    
    await gridButton.click()
    await page.waitForTimeout(200)
  })
})
