import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/road-management',
  },
  {
    path: '/road-management',
    name: 'RoadManagement',
    component: () => import('@/views/RoadManagement.vue'),
    meta: { title: '路政管理' },
  },
  {
    path: '/lighting-control',
    name: 'LightingControl',
    component: () => import('@/views/LightingControl.vue'),
    meta: { title: '照明控制' },
  },
  {
    path: '/logs',
    name: 'Logs',
    component: () => import('@/views/LogsView.vue'),
    meta: { title: '工况日志' },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, _from, next) => {
  document.title = `${to.meta.title || 'PoleNexus'} - 智慧路灯物联网管理系统`
  next()
})

export default router