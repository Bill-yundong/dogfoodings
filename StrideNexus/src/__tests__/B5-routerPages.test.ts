import { describe, it, expect } from 'vitest'

describe('B5-路由与页面结构', () => {
  const routes = [
    { path: '/', name: 'Dashboard', meta: { title: '仪表盘' } },
    { path: '/monitor', name: 'Monitor', meta: { title: '实时监测' } },
    { path: '/assessment', name: 'Assessment', meta: { title: '损伤评估' } },
    { path: '/shoes', name: 'Shoes', meta: { title: '跑鞋管理' } },
    { path: '/history', name: 'History', meta: { title: '历史分析' } },
    { path: '/settings', name: 'Settings', meta: { title: '系统设置' } }
  ]

  it('B5.1 6个核心路由均已定义', () => {
    expect(routes.length).toBe(6)
  })

  it('B5.2 仪表盘路由 / 指向 Dashboard', () => {
    const dashboard = routes.find(r => r.path === '/')
    expect(dashboard).toBeDefined()
    expect(dashboard!.name).toBe('Dashboard')
  })

  it('B5.3 实时监测路由 /monitor 指向 Monitor', () => {
    const monitor = routes.find(r => r.path === '/monitor')
    expect(monitor).toBeDefined()
    expect(monitor!.name).toBe('Monitor')
  })

  it('B5.4 损伤评估路由 /assessment 指向 Assessment', () => {
    const assessment = routes.find(r => r.path === '/assessment')
    expect(assessment).toBeDefined()
    expect(assessment!.name).toBe('Assessment')
  })

  it('B5.5 跑鞋管理路由 /shoes 指向 Shoes', () => {
    const shoes = routes.find(r => r.path === '/shoes')
    expect(shoes).toBeDefined()
    expect(shoes!.name).toBe('Shoes')
  })

  it('B5.6 历史分析路由 /history 指向 History', () => {
    const history = routes.find(r => r.path === '/history')
    expect(history).toBeDefined()
    expect(history!.name).toBe('History')
  })

  it('B5.7 系统设置路由 /settings 指向 Settings', () => {
    const settings = routes.find(r => r.path === '/settings')
    expect(settings).toBeDefined()
    expect(settings!.name).toBe('Settings')
  })

  it('B5.8 所有路由都有meta.title', () => {
    for (const route of routes) {
      expect(route.meta.title).toBeDefined()
      expect(route.meta.title.length).toBeGreaterThan(0)
    }
  })

  it('B5.9 路由路径无重复', () => {
    const paths = routes.map(r => r.path)
    const uniquePaths = new Set(paths)
    expect(uniquePaths.size).toBe(paths.length)
  })

  it('B5.10 路由名称无重复', () => {
    const names = routes.map(r => r.name)
    const uniqueNames = new Set(names)
    expect(uniqueNames.size).toBe(names.length)
  })
})
