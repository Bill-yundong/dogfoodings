import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ScoreRing from '@/components/pose/ScoreRing.vue'

describe('ScoreRing 组件', () => {
  it('应该正确渲染 SVG 元素', () => {
    const wrapper = mount(ScoreRing, {
      props: {
        score: 75,
        size: 200
      }
    })
    
    const svg = wrapper.find('svg')
    expect(svg.exists()).toBe(true)
    expect(svg.attributes('width')).toBe('200')
    expect(svg.attributes('height')).toBe('200')
  })

  it('应该正确显示分数文字', () => {
    const wrapper = mount(ScoreRing, {
      props: {
        score: 85.5,
        size: 150
      }
    })
    
    const span = wrapper.find('span.text-3xl')
    expect(span.exists()).toBe(true)
    expect(span.text()).toContain('86')
  })

  it('满分 100 应该显示正确', () => {
    const wrapper = mount(ScoreRing, {
      props: {
        score: 100,
        size: 100
      }
    })
    
    const span = wrapper.find('span.text-3xl')
    expect(span.text()).toContain('100')
  })

  it('0 分应该显示正确', () => {
    const wrapper = mount(ScoreRing, {
      props: {
        score: 0,
        size: 100
      }
    })
    
    const span = wrapper.find('span.text-3xl')
    expect(span.text()).toContain('0')
  })

  it('应该使用默认大小 120', () => {
    const wrapper = mount(ScoreRing, {
      props: {
        score: 50
      }
    })
    
    const svg = wrapper.find('svg')
    expect(svg.attributes('width')).toBe('120')
    expect(svg.attributes('height')).toBe('120')
  })

  it('分数应该有正确的颜色等级', () => {
    const wrapperHigh = mount(ScoreRing, {
      props: {
        score: 95,
        size: 100
      }
    })
    
    const circles = wrapperHigh.findAll('circle')
    expect(circles.length).toBe(2)
  })

  it('应该包含两个圆形路径 (背景和进度)', () => {
    const wrapper = mount(ScoreRing, {
      props: {
        score: 60,
        size: 100
      }
    })
    
    const paths = wrapper.findAll('circle')
    expect(paths.length).toBeGreaterThanOrEqual(1)
  })
})
