import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import Home from '@/views/Home.vue'
import Courses from '@/views/Courses.vue'
import CourseDetail from '@/views/CourseDetail.vue'
import Login from '@/views/Login.vue'
import Profile from '@/views/Profile.vue'
import { routes } from '@/router'
import { useCourseStore } from '@/stores/course'
import { useUserStore } from '@/stores/user'

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes
  })
}

describe('核心业务流程集成测试', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('场景 1: 用户浏览首页', () => {
    it('首页应该正确渲染核心组件', async () => {
      const router = createTestRouter()
      const courseStore = useCourseStore()
      
      await courseStore.loadCourses()
      
      const wrapper = mount(Home, {
        global: {
          plugins: [router]
        }
      })
      
      expect(wrapper.text()).toContain('PoseNexus')
      expect(wrapper.text()).toContain('推荐课程')
      expect(wrapper.text()).toContain('为什么选择 PoseNexus')
      
      const courseCards = wrapper.findAll('.glass-card.glass-card-hover')
      expect(courseCards.length).toBeGreaterThan(0)
    })

    it('首页应该显示数据看板', async () => {
      const router = createTestRouter()
      const wrapper = mount(Home, {
        global: {
          plugins: [router]
        }
      })
      
      const statCards = wrapper.findAll('.grid > .glass-card')
      expect(statCards.length).toBe(4)
    })

    it('首页推荐课程应该显示课程图片', async () => {
      const router = createTestRouter()
      const courseStore = useCourseStore()
      await courseStore.loadCourses()
      
      const wrapper = mount(Home, {
        global: {
          plugins: [router]
        }
      })
      
      const images = wrapper.findAll('img')
      expect(images.length).toBeGreaterThan(0)
      
      const firstImage = images[0]
      expect(firstImage.attributes('src')).toBeDefined()
      expect(firstImage.attributes('alt')).toBeDefined()
    })
  })

  describe('场景 2: 用户浏览课程列表', () => {
    it('课程列表应该显示所有课程', async () => {
      const router = createTestRouter()
      const courseStore = useCourseStore()
      await courseStore.loadCourses()
      
      const wrapper = mount(Courses, {
        global: {
          plugins: [router]
        }
      })
      
      expect(wrapper.text()).toContain('课程中心')
      
      const courseCards = wrapper.findAll('.glass-card.glass-card-hover')
      expect(courseCards.length).toBe(courseStore.courses.length)
    })

    it('课程应该显示难度标签', async () => {
      const router = createTestRouter()
      const courseStore = useCourseStore()
      await courseStore.loadCourses()
      
      const wrapper = mount(Courses, {
        global: {
          plugins: [router]
        }
      })
      
      const difficultyTags = wrapper.findAll('.rounded-full')
      expect(difficultyTags.length).toBeGreaterThan(0)
    })

    it('课程筛选功能应该存在', async () => {
      const router = createTestRouter()
      const wrapper = mount(Courses, {
        global: {
          plugins: [router]
        }
      })
      
      const searchInput = wrapper.find('input[type="text"]')
      expect(searchInput.exists()).toBe(true)
      
      const select = wrapper.find('select')
      expect(select.exists()).toBe(true)
    })
  })

  describe('场景 3: 用户登录流程', () => {
    it('登录页应该正确渲染表单', () => {
      const router = createTestRouter()
      const wrapper = mount(Login, {
        global: {
          plugins: [router]
        }
      })
      
      expect(wrapper.text()).toContain('登录')
      expect(wrapper.find('input[type="email"]').exists()).toBe(true)
      expect(wrapper.find('input[type="password"]').exists()).toBe(true)
      expect(wrapper.find('button[type="submit"]').exists()).toBe(true)
    })

    it('登录应该更新用户状态', async () => {
      const router = createTestRouter()
      const userStore = useUserStore()
      
      const wrapper = mount(Login, {
        global: {
          plugins: [router]
        }
      })
      
      const emailInput = wrapper.find('input[type="email"]')
      const passwordInput = wrapper.find('input[type="password"]')
      const submitButton = wrapper.find('button[type="submit"]')
      
      await emailInput.setValue('test@example.com')
      await passwordInput.setValue('password123')
      await submitButton.trigger('submit')
      
      await new Promise(resolve => setTimeout(resolve, 1100))
      await wrapper.vm.$nextTick()
      
      expect(userStore.isLoggedIn).toBe(true)
      expect(userStore.currentUser?.email).toBe('test@example.com')
    }, 10000)

    it('登录后应该跳转到首页', async () => {
      const router = createTestRouter()
      const pushSpy = vi.spyOn(router, 'push')
      
      const wrapper = mount(Login, {
        global: {
          plugins: [router]
        }
      })
      
      const emailInput = wrapper.find('input[type="email"]')
      const passwordInput = wrapper.find('input[type="password"]')
      const submitButton = wrapper.find('button[type="submit"]')
      
      await emailInput.setValue('test@example.com')
      await passwordInput.setValue('password123')
      await submitButton.trigger('submit')
      
      await new Promise(resolve => setTimeout(resolve, 1100))
      await wrapper.vm.$nextTick()
      
      expect(pushSpy).toHaveBeenCalledWith('/')
    }, 10000)
  })

  describe('场景 4: 个人中心', () => {
    it('未登录用户访问个人中心应该显示退出按钮', () => {
      const router = createTestRouter()
      const wrapper = mount(Profile, {
        global: {
          plugins: [router]
        }
      })
      
      expect(wrapper.text()).toContain('退出')
    })

    it('已登录用户应该看到个人信息', () => {
      const router = createTestRouter()
      const userStore = useUserStore()
      userStore.login('test@example.com', 'password123')
      
      const wrapper = mount(Profile, {
        global: {
          plugins: [router]
        }
      })
      
      expect(wrapper.text()).toContain('test')
      expect(wrapper.text()).toContain('test@example.com')
    })

    it('个人中心应该显示训练统计', () => {
      const router = createTestRouter()
      const userStore = useUserStore()
      userStore.login('test@example.com', 'password123')
      
      const wrapper = mount(Profile, {
        global: {
          plugins: [router]
        }
      })
      
      const statCards = wrapper.findAll('.grid > .glass-card')
      expect(statCards.length).toBeGreaterThan(0)
    })
  })

  describe('场景 5: 课程详情页面', () => {
    it('课程详情应该显示课程信息', async () => {
      const router = createTestRouter()
      const courseStore = useCourseStore()
      await courseStore.loadCourses()
      
      await router.push(`/courses/${courseStore.courses[0].id}`)
      
      const wrapper = mount(CourseDetail, {
        global: {
          plugins: [router]
        }
      })
      
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect(wrapper.text()).toContain(courseStore.courses[0].name)
      expect(wrapper.text()).toContain('开始训练')
    })

    it('课程详情应该显示动作列表', async () => {
      const router = createTestRouter()
      const courseStore = useCourseStore()
      await courseStore.loadCourses()
      
      await router.push(`/courses/${courseStore.courses[0].id}`)
      
      const wrapper = mount(CourseDetail, {
        global: {
          plugins: [router]
        }
      })
      
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect(wrapper.text()).toContain('动作列表')
    })

    it('课程详情应该显示课程图片', async () => {
      const router = createTestRouter()
      const courseStore = useCourseStore()
      await courseStore.loadCourses()
      
      await router.push(`/courses/${courseStore.courses[0].id}`)
      
      const wrapper = mount(CourseDetail, {
        global: {
          plugins: [router]
        }
      })
      
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const image = wrapper.find('img')
      expect(image.exists()).toBe(true)
      expect(image.attributes('src')).toBeDefined()
    })
  })

  describe('场景 6: 导航功能', () => {
    it('首页应该显示核心内容', () => {
      const router = createTestRouter()
      const wrapper = mount(Home, {
        global: {
          plugins: [router]
        }
      })
      
      expect(wrapper.text()).toContain('PoseNexus')
      expect(wrapper.text()).toContain('开始训练')
      expect(wrapper.text()).toContain('查看课程')
    })
  })
})
