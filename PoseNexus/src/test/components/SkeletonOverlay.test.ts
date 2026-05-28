import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import SkeletonOverlay from '@/components/pose/SkeletonOverlay.vue'
import type { PoseData, Keypoint } from '@/types/pose'
import { SKELETON_CONNECTIONS } from '@/types/pose'

function createMockPose(): PoseData {
  const keypoints: Keypoint[] = []
  for (let i = 0; i < 33; i++) {
    keypoints.push({
      x: 0.3 + (i % 5) * 0.1,
      y: 0.2 + Math.floor(i / 8) * 0.15,
      z: 0,
      visibility: 0.9,
      score: 0.85
    })
  }
  return {
    timestamp: Date.now(),
    keypoints,
    score: 0.9
  }
}

describe('SkeletonOverlay 组件', () => {
  const width = 640
  const height = 480

  it('应该正确渲染 canvas 元素', () => {
    const pose = createMockPose()
    const wrapper = mount(SkeletonOverlay, {
      props: {
        pose,
        width,
        height
      }
    })
    
    const canvas = wrapper.find('canvas')
    expect(canvas.exists()).toBe(true)
    expect(canvas.attributes('width')).toBe(String(width))
    expect(canvas.attributes('height')).toBe(String(height))
  })

  it('没有 pose 数据时不应该渲染关键点', () => {
    const wrapper = mount(SkeletonOverlay, {
      props: {
        pose: null,
        width,
        height
      }
    })
    
    const canvas = wrapper.find('canvas')
    expect(canvas.exists()).toBe(true)
  })

  it('应该支持自定义 canvas class', () => {
    const pose = createMockPose()
    const wrapper = mount(SkeletonOverlay, {
      props: {
        pose,
        width,
        height,
        class: 'custom-class'
      }
    })
    
    const canvas = wrapper.find('canvas')
    expect(canvas.classes()).toContain('custom-class')
  })

  it('SKELETON_CONNECTIONS 应该定义正确的骨骼连接', () => {
    expect(Array.isArray(SKELETON_CONNECTIONS)).toBe(true)
    expect(SKELETON_CONNECTIONS.length).toBeGreaterThan(0)
    
    SKELETON_CONNECTIONS.forEach(([from, to]) => {
      expect(typeof from).toBe('number')
      expect(typeof to).toBe('number')
      expect(from).toBeGreaterThanOrEqual(0)
      expect(from).toBeLessThan(33)
      expect(to).toBeGreaterThanOrEqual(0)
      expect(to).toBeLessThan(33)
    })
  })

  it('should handle width and height updates', async () => {
    const pose = createMockPose()
    const wrapper = mount(SkeletonOverlay, {
      props: {
        pose,
        width,
        height
      }
    })
    
    await wrapper.setProps({ width: 800, height: 600 })
    
    const canvas = wrapper.find('canvas')
    expect(canvas.attributes('width')).toBe('800')
    expect(canvas.attributes('height')).toBe('600')
  })
})
