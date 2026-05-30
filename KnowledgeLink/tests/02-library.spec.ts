import { test, expect } from './fixtures'

test.describe('2. 阅读库模块集成测试', () => {
  test('2.1 初始状态显示空状态', async ({ page }) => {
    await page.goto('/#/library')
    await expect(page.locator('text=还没有藏书')).toBeVisible()
    await expect(page.locator('text=添加书籍')).toBeVisible()
  })

  test('2.2 添加新书流程', async ({ page, testData }) => {
    await page.goto('/#/library')
    
    await page.click('text=添加书籍')
    await expect(page.locator('text=添加新书')).toBeVisible()
    
    await page.fill('input[placeholder="输入书名"]', '《思考，快与慢》')
    await page.fill('input[placeholder="输入作者"]', '丹尼尔·卡尼曼')
    await page.fill('input[placeholder="如：哲学、计算机科学"]', '心理学')
    await page.fill('input[placeholder="1"]', '38')
    
    await page.click('button:has-text("添加")')
    
    await expect(page.locator('text=《思考，快与慢》')).toBeVisible()
    await expect(page.locator('text=丹尼尔·卡尼曼')).toBeVisible()
    await expect(page.locator('text=心理学')).toBeVisible()
    await expect(page.locator('text=共 1 本藏书')).toBeVisible()
  })

  test('2.3 添加多本书并验证列表', async ({ page }) => {
    await page.goto('/#/library')
    
    const books = [
      { title: '《人类简史》', author: '尤瓦尔·赫拉利', category: '历史', chapters: '20' },
      { title: '《深度学习》', author: 'Ian Goodfellow', category: '计算机科学', chapters: '21' },
      { title: '《活出生命的意义》', author: '维克多·弗兰克尔', category: '哲学', chapters: '10' },
    ]

    for (const book of books) {
      await page.click('text=添加书籍')
      await page.fill('input[placeholder="输入书名"]', book.title)
      await page.fill('input[placeholder="输入作者"]', book.author)
      await page.fill('input[placeholder="如：哲学、计算机科学"]', book.category)
      await page.fill('input[placeholder="1"]', book.chapters)
      await page.click('button:has-text("添加")')
      await page.waitForTimeout(300)
    }

    await expect(page.locator('text=共 3 本藏书')).toBeVisible()
    const bookCards = page.locator('a[href^="#/library/"]')
    expect(await bookCards.count()).toBe(3)
    
    for (const book of books) {
      await expect(page.locator(`text=${book.title}`)).toBeVisible()
    }
  })

  test('2.4 搜索书籍功能', async ({ page }) => {
    await page.goto('/#/library')
    
    const books = [
      { title: '《思考，快与慢》', author: '丹尼尔·卡尼曼', category: '心理学', chapters: '38' },
      { title: '《思考致富》', author: '拿破仑·希尔', category: '成功学', chapters: '15' },
    ]

    for (const book of books) {
      await page.click('text=添加书籍')
      await page.fill('input[placeholder="输入书名"]', book.title)
      await page.fill('input[placeholder="输入作者"]', book.author)
      await page.fill('input[placeholder="如：哲学、计算机科学"]', book.category)
      await page.fill('input[placeholder="1"]', book.chapters)
      await page.click('button:has-text("添加")')
      await page.waitForTimeout(300)
    }

    await page.fill('input[placeholder="搜索书籍或作者..."]', '思考')
    await page.waitForTimeout(200)
    
    const bookCards = page.locator('a[href^="#/library/"]')
    expect(await bookCards.count()).toBe(2)
    
    await page.fill('input[placeholder="搜索书籍或作者..."]', '卡尼曼')
    await page.waitForTimeout(200)
    expect(await bookCards.count()).toBe(1)
    await expect(page.locator('text=《思考，快与慢》')).toBeVisible()
    
    await page.fill('input[placeholder="搜索书籍或作者..."]', '不存在')
    await page.waitForTimeout(200)
    await expect(page.locator('text=还没有藏书')).toBeVisible()
  })

  test('2.5 分类筛选功能', async ({ page }) => {
    await page.goto('/#/library')
    
    const books = [
      { title: '《深度学习》', author: 'Ian Goodfellow', category: '计算机科学', chapters: '21' },
      { title: '《代码整洁之道》', author: 'Robert C. Martin', category: '计算机科学', chapters: '17' },
      { title: '《人类简史》', author: '尤瓦尔·赫拉利', category: '历史', chapters: '20' },
    ]

    for (const book of books) {
      await page.click('text=添加书籍')
      await page.fill('input[placeholder="输入书名"]', book.title)
      await page.fill('input[placeholder="输入作者"]', book.author)
      await page.fill('input[placeholder="如：哲学、计算机科学"]', book.category)
      await page.fill('input[placeholder="1"]', book.chapters)
      await page.click('button:has-text("添加")')
      await page.waitForTimeout(300)
    }

    await page.selectOption('select', '计算机科学')
    await page.waitForTimeout(200)
    
    const bookCards = page.locator('a[href^="#/library/"]')
    expect(await bookCards.count()).toBe(2)
    await expect(page.locator('text=《深度学习》')).toBeVisible()
    await expect(page.locator('text=《代码整洁之道》')).toBeVisible()
    
    await page.selectOption('select', '全部分类')
    await page.waitForTimeout(200)
    expect(await bookCards.count()).toBe(3)
  })

  test('2.6 点击书籍进入详情页', async ({ page, testData }) => {
    await page.goto('/#/library')
    
    await page.click('text=添加书籍')
    await page.fill('input[placeholder="输入书名"]', '《测试书籍》')
    await page.fill('input[placeholder="输入作者"]', '测试作者')
    await page.fill('input[placeholder="如：哲学、计算机科学"]', '测试分类')
    await page.fill('input[placeholder="1"]', '10')
    await page.click('button:has-text("添加")')
    
    await page.click('text=《测试书籍》')
    await expect(page.locator('h1')).toHaveText('《测试书籍》')
    await expect(page.locator('text=测试作者')).toBeVisible()
    await expect(page.locator('text=测试分类')).toBeVisible()
  })

  test('2.7 取消添加书籍', async ({ page }) => {
    await page.goto('/#/library')
    
    await page.click('text=添加书籍')
    await expect(page.locator('text=添加新书')).toBeVisible()
    
    await page.fill('input[placeholder="输入书名"]', '《被取消的书》')
    await page.click('text=取消')
    
    await expect(page.locator('text=添加新书')).not.toBeVisible()
    await expect(page.locator('text=《被取消的书》')).not.toBeVisible()
  })

  test('2.8 阅读进度显示', async ({ page }) => {
    await page.goto('/#/library')
    
    await page.click('text=添加书籍')
    await page.fill('input[placeholder="输入书名"]', '《进度测试》')
    await page.fill('input[placeholder="输入作者"]', '作者')
    await page.fill('input[placeholder="1"]', '10')
    await page.click('button:has-text("添加")')
    
    const progressText = page.locator('text=0%')
    await expect(progressText.first()).toBeVisible()
    
    const intakeText = page.locator('text=摄入指数')
    await expect(intakeText.first()).toBeVisible()
  })
})
