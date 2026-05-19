import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/monitor'
  },
  {
    path: '/monitor',
    name: 'Monitor',
    component: () => import('@/views/MonitorView.vue'),
    meta: { title: '安监监控大屏' }
  },
  {
    path: '/config',
    name: 'Config',
    component: () => import('@/views/ConfigView.vue'),
    meta: { title: '参数配置' }
  },
  {
    path: '/terminal',
    name: 'Terminal',
    component: () => import('@/views/TerminalView.vue'),
    meta: { title: '应急终端' }
  },
  {
    path: '/command',
    name: 'Command',
    component: () => import('@/views/CommandView.vue'),
    meta: { title: '联动指挥' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, _from, next) => {
  document.title = `${to.meta.title || '危化品泄漏模拟系统'} - TankNexust`
  next()
})

export default router
