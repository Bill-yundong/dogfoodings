import { describe, it, expect } from 'vitest'
import { render } from '@solidjs/testing-library'
import { HealthGauge } from './HealthGauge'

describe('HealthGauge 组件', () => {
  it('应正确渲染健康度仪表盘', () => {
    const { container } = render(() => <HealthGauge value={80} />)
    
    const svg = container.querySelector('svg')
    expect(svg).toBeDefined()
    
    const circles = container.querySelectorAll('circle')
    expect(circles).toHaveLength(2)
  })

  it('应显示健康度百分比', () => {
    const { container } = render(() => <HealthGauge value={75} />)
    
    const text = container.textContent
    expect(text).toContain('75%')
  })

  it('应显示自定义标签', () => {
    const { getByText } = render(() => <HealthGauge value={80} label="健康度" />)
    
    expect(getByText('健康度')).toBeDefined()
  })

  it('应支持自定义尺寸', () => {
    const { container } = render(() => <HealthGauge value={80} size={200} />)
    
    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('width')).toBe('200')
    expect(svg?.getAttribute('height')).toBe('200')
  })

  it('高健康度应显示绿色', () => {
    const { container } = render(() => <HealthGauge value={90} />)
    
    const circles = container.querySelectorAll('circle')
    const progressCircle = circles[1]
    expect(progressCircle.getAttribute('stroke')).toBe('#10b981')
  })

  it('中等健康度应显示橙色', () => {
    const { container } = render(() => <HealthGauge value={50} />)
    
    const circles = container.querySelectorAll('circle')
    const progressCircle = circles[1]
    expect(progressCircle.getAttribute('stroke')).toBe('#f59e0b')
  })

  it('低健康度应显示红色', () => {
    const { container } = render(() => <HealthGauge value={20} />)
    
    const circles = container.querySelectorAll('circle')
    const progressCircle = circles[1]
    expect(progressCircle.getAttribute('stroke')).toBe('#ef4444')
  })

  it('健康度超过100应显示100%', () => {
    const { container } = render(() => <HealthGauge value={120} />)
    
    const text = container.textContent
    expect(text).toContain('100%')
  })

  it('健康度低于0应显示0%', () => {
    const { container } = render(() => <HealthGauge value={-10} />)
    
    const text = container.textContent
    expect(text).toContain('0%')
  })

  it('应使用默认尺寸150', () => {
    const { container } = render(() => <HealthGauge value={80} />)
    
    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('width')).toBe('150')
    expect(svg?.getAttribute('height')).toBe('150')
  })
})
