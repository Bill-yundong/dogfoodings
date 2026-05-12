import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mount } from 'svelte'
import App from '../../src/App.svelte'

describe('App 集成测试', () => {
  let container

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    container.remove()
  })

  describe('应用初始化', () => {
    it('应成功挂载应用组件', () => {
      const app = mount(App, { target: container })
      expect(app).toBeDefined()
    })

    it('应包含正确的标题', () => {
      mount(App, { target: container })
      const header = document.querySelector('h1')
      expect(header).not.toBeNull()
      expect(header.textContent).toContain('RadarPulse')
    })

    it('应包含所有主要控制按钮', () => {
      mount(App, { target: container })
      const buttons = document.querySelectorAll('button')
      const buttonTexts = Array.from(buttons).map(b => b.textContent)
      
      expect(buttonTexts).toContain('⏮️ 上一帧')
      expect(buttonTexts).toContain('▶️ 播放')
      expect(buttonTexts).toContain('⏭️ 下一帧')
      expect(buttonTexts).toContain('🔮 重新预报')
    })

    it('应包含侧边栏面板', () => {
      mount(App, { target: container })
      const panels = document.querySelectorAll('.panel')
      expect(panels.length).toBeGreaterThanOrEqual(3)
    })
  })

  describe('雷达数据显示', () => {
    it('应显示雷达画布元素', () => {
      mount(App, { target: container })
      const canvas = document.querySelector('canvas')
      expect(canvas).not.toBeNull()
    })

    it('画布应具有正确的尺寸', () => {
      mount(App, { target: container })
      const canvas = document.querySelector('canvas')
      expect(canvas.width).toBe(800)
      expect(canvas.height).toBe(600)
    })
  })

  describe('预警系统', () => {
    it('应显示预警横幅', () => {
      mount(App, { target: container })
      const alertBanner = document.querySelector('.alert-banner')
      expect(alertBanner).not.toBeNull()
    })

    it('初始预警状态应为正常', () => {
      mount(App, { target: container })
      const alertBanner = document.querySelector('.alert-banner')
      expect(alertBanner.className).toContain('normal')
    })
  })
})
