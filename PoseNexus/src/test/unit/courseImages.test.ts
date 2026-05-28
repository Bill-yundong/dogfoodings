import { describe, it, expect } from 'vitest'
import { getDefaultImageByCategory, getCourseThumbnail } from '@/utils/courseImages'

describe('课程图片工具函数', () => {
  describe('getDefaultImageByCategory', () => {
    it('应该为瑜伽类别返回正确的图片 URL', () => {
      const url = getDefaultImageByCategory('瑜伽')
      expect(url).toContain('yoga')
      expect(url).toContain('text_to_image')
      expect(url).toContain('landscape_16_9')
    })

    it('应该为 HIIT 类别返回正确的图片 URL', () => {
      const url = getDefaultImageByCategory('HIIT')
      expect(url).toContain('hiit')
      expect(url).toContain('workout')
    })

    it('应该为力量训练类别返回正确的图片 URL', () => {
      const url = getDefaultImageByCategory('力量训练')
      expect(url).toContain('strength')
      expect(url).toContain('weightlifting')
    })

    it('应该为未知类别返回默认图片 URL', () => {
      const url = getDefaultImageByCategory('未知运动')
      expect(url).toContain('fitness')
      expect(url).toContain('workout')
    })

    it('所有已知类别都应该返回有效的 URL', () => {
      const categories = [
        '瑜伽', 'HIIT', '力量训练', '拉伸', '普拉提',
        '有氧', '舞蹈', '拳击', '跑步', '骑行'
      ]
      
      categories.forEach(category => {
        const url = getDefaultImageByCategory(category)
        expect(url).toBeTypeOf('string')
        expect(url.length).toBeGreaterThan(0)
        expect(url.startsWith('https://')).toBe(true)
      })
    })
  })

  describe('getCourseThumbnail', () => {
    it('当提供自定义缩略图时应该返回自定义缩略图', () => {
      const customThumbnail = 'https://example.com/custom.jpg'
      const url = getCourseThumbnail(customThumbnail, '瑜伽')
      expect(url).toBe(customThumbnail)
    })

    it('当缩略图为空时应该返回类别默认图片', () => {
      const url = getCourseThumbnail('', '瑜伽')
      expect(url).toContain('yoga')
    })

    it('当缩略图为 undefined 时应该返回类别默认图片', () => {
      const url = getCourseThumbnail(undefined, 'HIIT')
      expect(url).toContain('hiit')
    })

    it('当缩略图为空白字符串时应该返回类别默认图片', () => {
      const url = getCourseThumbnail('   ', '力量训练')
      expect(url).toContain('strength')
    })

    it('当缩略图和类别都为空时应该返回通用默认图片', () => {
      const url = getCourseThumbnail('', '')
      expect(url).toContain('fitness')
    })
  })
})
