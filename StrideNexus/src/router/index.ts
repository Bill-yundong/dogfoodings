import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('@/pages/Dashboard.vue'),
    meta: { title: '仪表盘' }
  },
  {
    path: '/monitor',
    name: 'Monitor',
    component: () => import('@/pages/Monitor.vue'),
    meta: { title: '实时监测' }
  },
  {
    path: '/assessment',
    name: 'Assessment',
    component: () => import('@/pages/Assessment.vue'),
    meta: { title: '损伤评估' }
  },
  {
    path: '/shoes',
    name: 'Shoes',
    component: () => import('@/pages/Shoes.vue'),
    meta: { title: '跑鞋管理' }
  },
  {
    path: '/history',
    name: 'History',
    component: () => import('@/pages/History.vue'),
    meta: { title: '历史分析' }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/pages/Settings.vue'),
    meta: { title: '系统设置' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, _from, next) => {
  document.title = `StrideNexus - ${to.meta.title || '运动损伤监测'}`
  next()
})

export default router
