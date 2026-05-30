import { test, expect } from './fixtures'

test.describe('1. 应用布局与导航测试', () => {
  test('1.1 页面加载并显示侧边栏导航', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('aside')).toBeVisible()
    await expect(page.locator('text=KnowledgeLink')).toBeVisible()
  })

  test('1.2 侧边栏导航项显示为中文', async ({ page }) => {
    await page.goto('/')
    const navItems = page.locator('aside button span')
    await expect(navItems.nth(0)).toHaveText('阅读库')
    await expect(navItems.nth(1)).toHaveText('笔记')
    await expect(navItems.nth(2)).toHaveText('复习')
    await expect(navItems.nth(3)).toHaveText('知识图谱')
    await expect(navItems.nth(4)).toHaveText('成长仪表板')
  })

  test('1.3 导航到阅读库页面', async ({ page }) => {
    await page.goto('/')
    await page.click('text=阅读库')
    await expect(page.locator('h1')).toHaveText('阅读库')
    await expect(page.locator('header span')).toHaveText('阅读库')
  })

  test('1.4 导航到笔记页面', async ({ page }) => {
    await page.goto('/')
    await page.click('text=笔记')
    await expect(page.locator('h1')).toHaveText('笔记系统')
    await expect(page.locator('header span')).toHaveText('笔记')
  })

  test('1.5 导航到复习页面', async ({ page }) => {
    await page.goto('/')
    await page.click('text=复习')
    await expect(page.locator('h1')).toHaveText('复习引擎')
    await expect(page.locator('header span')).toHaveText('复习')
  })

  test('1.6 导航到知识图谱页面', async ({ page }) => {
    await page.goto('/')
    await page.click('text=知识图谱')
    await expect(page.locator('h1')).toHaveText('知识图谱')
    await expect(page.locator('header span')).toHaveText('知识图谱')
  })

  test('1.7 导航到成长仪表板页面', async ({ page }) => {
    await page.goto('/')
    await page.click('text=成长仪表板')
    await expect(page.locator('h1')).toHaveText('成长仪表板')
    await expect(page.locator('header span')).toHaveText('仪表板')
  })

  test('1.8 Hash 路由直接访问', async ({ page }) => {
    await page.goto('/#/notes')
    await expect(page.locator('h1')).toHaveText('笔记系统')
    
    await page.goto('/#/graph')
    await expect(page.locator('h1')).toHaveText('知识图谱')
  })

  test('1.9 离线模式标识显示', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=离线模式')).toBeVisible()
    await expect(page.locator('text=v1.0')).toBeVisible()
  })
})
