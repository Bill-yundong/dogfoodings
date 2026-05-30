import { test, expect } from './fixtures'

test.describe('4. 知识图谱模块集成测试', () => {
  test('4.1 初始状态显示空图谱', async ({ page }) => {
    await page.goto('/#/graph')
    await expect(page.locator('h1')).toHaveText('知识图谱')
    await expect(page.locator('text=暂无知识节点')).toBeVisible()
  })

  test('4.2 创建带知识链接的笔记后图谱显示节点', async ({ page }) => {
    await page.goto('/#/notes')
    
    await page.click('text=新建笔记')
    await page.fill('input[placeholder="笔记标题"]', '图谱测试笔记')
    await page.fill('textarea[placeholder="笔记内容... 使用 [[双括号]] 创建知识链接"]', 
      '[[概念A]] 和 [[概念B]] 是相关的，它们都与 [[概念C]] 有联系。')
    await page.click('button:has-text("创建")')
    await page.waitForTimeout(500)
    
    await page.goto('/#/graph')
    await page.waitForTimeout(500)
    
    await expect(page.locator('svg')).toBeVisible()
    
    const nodeCount = await page.evaluate(() => {
      const svg = document.querySelector('svg')
      if (!svg) return 0
      const nodes = svg.querySelectorAll('g > g')
      return nodes.length
    })
    
    expect(nodeCount).toBeGreaterThanOrEqual(3)
  })

  test('4.3 图谱显示节点和边数量', async ({ page }) => {
    await page.goto('/#/notes')
    
    await page.click('text=新建笔记')
    await page.fill('input[placeholder="笔记标题"]', '多概念笔记')
    await page.fill('textarea[placeholder="笔记内容... 使用 [[双括号]] 创建知识链接"]', 
      '[[认知科学]] [[心理学]] [[神经科学]] [[哲学]] [[人工智能]]')
    await page.click('button:has-text("创建")')
    await page.waitForTimeout(500)
    
    await page.goto('/#/graph')
    await page.waitForTimeout(500)
    
    const statsText = page.locator('text=/\\d+ 个节点 · \\d+ 条边/')
    await expect(statsText).toBeVisible()
    
    const text = await statsText.textContent()
    const nodeMatch = text?.match(/(\d+) 个节点/)
    const edgeMatch = text?.match(/(\d+) 条边/)
    
    expect(Number(nodeMatch?.[1])).toBeGreaterThanOrEqual(5)
    expect(Number(edgeMatch?.[1])).toBeGreaterThanOrEqual(4)
  })

  test('4.4 图谱缩放功能', async ({ page }) => {
    await page.goto('/#/notes')
    
    await page.click('text=新建笔记')
    await page.fill('input[placeholder="笔记标题"]', '缩放测试')
    await page.fill('textarea[placeholder="笔记内容... 使用 [[双括号]] 创建知识链接"]', '[[节点1]] [[节点2]]')
    await page.click('button:has-text("创建")')
    await page.waitForTimeout(500)
    
    await page.goto('/#/graph')
    await page.waitForTimeout(500)
    
    const initialZoom = await page.evaluate(() => {
      const span = document.querySelector('span:has-text("缩放")')
      return span?.textContent || ''
    })
    
    const zoomInBtn = page.locator('button[aria-label="zoom-in"]')
    await zoomInBtn.click()
    await page.waitForTimeout(200)
    
    const zoomAfterIn = await page.evaluate(() => {
      const span = document.querySelector('span:has-text("缩放")')
      return span?.textContent || ''
    })
    
    expect(zoomAfterIn).not.toBe(initialZoom)
  })

  test('4.5 点击节点显示详情面板', async ({ page }) => {
    await page.goto('/#/notes')
    
    await page.click('text=新建笔记')
    await page.fill('input[placeholder="笔记标题"]', '节点测试')
    await page.fill('textarea[placeholder="笔记内容... 使用 [[双括号]] 创建知识链接"]', 
      '[[测试节点]] 是一个重要的概念。')
    await page.click('button:has-text("创建")')
    await page.waitForTimeout(500)
    
    await page.goto('/#/graph')
    await page.waitForTimeout(1000)
    
    const nodeClicked = await page.evaluate(() => {
      const svg = document.querySelector('svg')
      if (!svg) return false
      const circles = svg.querySelectorAll('circle')
      if (circles.length > 0) {
        const circle = circles[0] as SVGCircleElement
        const rect = circle.getBoundingClientRect()
        const event = new MouseEvent('click', {
          clientX: rect.left + rect.width / 2,
          clientY: rect.top + rect.height / 2,
          bubbles: true
        })
        circle.dispatchEvent(event)
        return true
      }
      return false
    })
    
    if (nodeClicked) {
      await expect(page.locator('text=节点详情')).toBeVisible({ timeout: 5000 })
    }
  })

  test('4.6 图谱搜索功能', async ({ page }) => {
    await page.goto('/#/notes')
    
    await page.click('text=新建笔记')
    await page.fill('input[placeholder="笔记标题"]', '搜索测试')
    await page.fill('textarea[placeholder="笔记内容... 使用 [[双括号]] 创建知识链接"]', 
      '[[独特概念X]] 和 [[普通概念Y]] 是两个概念。')
    await page.click('button:has-text("创建")')
    await page.waitForTimeout(500)
    
    await page.goto('/#/graph')
    await page.waitForTimeout(500)
    
    await page.fill('input[placeholder="搜索节点..."]', '独特概念X')
    await page.waitForTimeout(300)
    
    const highlightNode = page.locator('circle[class*="stroke-accent"]')
    await expect(highlightNode).toBeVisible()
  })

  test('4.7 编辑笔记更新图谱', async ({ page }) => {
    await page.goto('/#/notes')
    
    await page.click('text=新建笔记')
    await page.fill('input[placeholder="笔记标题"]', '动态更新测试')
    await page.fill('textarea[placeholder="笔记内容... 使用 [[双括号]] 创建知识链接"]', 
      '[[概念1]]')
    await page.click('button:has-text("创建")')
    await page.waitForTimeout(500)
    
    await page.goto('/#/graph')
    await page.waitForTimeout(500)
    
    const initialNodeCount = await page.evaluate(() => {
      const match = document.body.textContent?.match(/(\d+) 个节点/)
      return match ? Number(match[1]) : 0
    })
    
    await page.goto('/#/notes')
    await page.click('text=动态更新测试')
    await page.fill('textarea', '[[概念1]] [[新概念2]] [[新概念3]]')
    await page.click('button:has-text("保存")')
    await page.waitForTimeout(500)
    
    await page.goto('/#/graph')
    await page.waitForTimeout(500)
    
    const updatedNodeCount = await page.evaluate(() => {
      const match = document.body.textContent?.match(/(\d+) 个节点/)
      return match ? Number(match[1]) : 0
    })
    
    expect(updatedNodeCount).toBeGreaterThan(initialNodeCount)
  })

  test('4.8 多篇笔记共同构建知识网络', async ({ page }) => {
    await page.goto('/#/notes')
    
    const notes = [
      { title: '笔记1', content: '[[认知]] [[学习]] [[记忆]]' },
      { title: '笔记2', content: '[[学习]] [[知识]] [[理解]]' },
      { title: '笔记3', content: '[[记忆]] [[遗忘]] [[复习]]' },
    ]

    for (const note of notes) {
      await page.click('text=新建笔记')
      await page.fill('input[placeholder="笔记标题"]', note.title)
      await page.fill('textarea[placeholder="笔记内容... 使用 [[双括号]] 创建知识链接"]', note.content)
      await page.click('button:has-text("创建")')
      await page.waitForTimeout(300)
    }
    
    await page.goto('/#/graph')
    await page.waitForTimeout(500)
    
    const stats = page.locator('text=/\\d+ 个节点 · \\d+ 条边/')
    const text = await stats.textContent()
    const nodeMatch = text?.match(/(\d+) 个节点/)
    const edgeMatch = text?.match(/(\d+) 条边/)
    
    expect(Number(nodeMatch?.[1])).toBeGreaterThanOrEqual(7)
    expect(Number(edgeMatch?.[1])).toBeGreaterThanOrEqual(6)
  })

  test('4.9 图谱节点聚类分析', async ({ page }) => {
    await page.goto('/#/notes')
    
    await page.click('text=新建笔记')
    await page.fill('input[placeholder="笔记标题"]', '聚类测试')
    await page.fill('textarea[placeholder="笔记内容... 使用 [[双括号]] 创建知识链接"]', 
      '[[A1]] [[A2]] [[A3]] [[B1]] [[B2]]')
    await page.click('button:has-text("创建")')
    await page.waitForTimeout(500)
    
    await page.goto('/#/graph')
    await page.waitForTimeout(500)
    
    await expect(page.locator('text=聚类分析')).toBeVisible()
  })
})
