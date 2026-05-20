import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/views/Dashboard.vue'),
    meta: { title: '监控总览', icon: 'Gauge' }
  },
  {
    path: '/thermal-model',
    name: 'ThermalModel',
    component: () => import('@/views/ThermalModel.vue'),
    meta: { title: '热模型预测', icon: 'Flame' }
  },
  {
    path: '/semantic-align',
    name: 'SemanticAlign',
    component: () => import('@/views/SemanticAlign.vue'),
    meta: { title: '语义对齐', icon: 'Link' }
  },
  {
    path: '/history',
    name: 'History',
    component: () => import('@/views/History.vue'),
    meta: { title: '历史数据', icon: 'History' }
  },
  {
    path: '/multi-station',
    name: 'MultiStation',
    component: () => import('@/views/MultiStation.vue'),
    meta: { title: '多电站管理', icon: 'Map' }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/views/Settings.vue'),
    meta: { title: '系统设置', icon: 'Settings' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, _from, next) => {
  document.title = `${to.meta.title || 'BatteryLogic'} - 储能电站热安全监控系统`
  next()
})

export default router
