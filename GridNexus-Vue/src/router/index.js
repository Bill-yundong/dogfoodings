import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/Dashboard.vue'),
    meta: { title: '电网负荷流转中枢 - 概览' }
  },
  {
    path: '/topology',
    name: 'topology',
    component: () => import('@/views/Topology.vue'),
    meta: { title: '电网拓扑分析' }
  },
  {
    path: '/snapshots',
    name: 'snapshots',
    component: () => import('@/views/Snapshots.vue'),
    meta: { title: '运行状态快照' }
  },
  {
    path: '/mapping',
    name: 'mapping',
    component: () => import('@/views/Mapping.vue'),
    meta: { title: '语义映射管理' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, _from, next) => {
  document.title = to.meta.title || 'GridNexus'
  next()
})

export default router
