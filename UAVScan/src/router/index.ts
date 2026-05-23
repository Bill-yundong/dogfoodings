import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import { useUiStore } from '@/stores'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/views/Dashboard.vue'),
    meta: {
      title: '数据仪表盘',
      icon: 'LayoutDashboard',
      requiresAuth: false
    }
  },
  {
    path: '/processing',
    name: 'Processing',
    component: () => import('@/views/ProcessingCenter.vue'),
    meta: {
      title: '处理中心',
      icon: 'Cpu',
      requiresAuth: false
    }
  },
  {
    path: '/visualizer',
    name: 'Visualizer',
    component: () => import('@/views/Visualizer.vue'),
    meta: {
      title: '点云可视化',
      icon: 'Box',
      requiresAuth: false
    }
  },
  {
    path: '/sync',
    name: 'Sync',
    component: () => import('@/views/SyncManager.vue'),
    meta: {
      title: '数据同步',
      icon: 'RefreshCw',
      requiresAuth: false
    }
  },
  {
    path: '/snapshots',
    name: 'Snapshots',
    component: () => import('@/views/SnapshotManager.vue'),
    meta: {
      title: '快照管理',
      icon: 'Camera',
      requiresAuth: false
    }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/views/Settings.vue'),
    meta: {
      title: '系统设置',
      icon: 'Settings',
      requiresAuth: false
    }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFound.vue'),
    meta: {
      title: '页面未找到',
      icon: 'AlertCircle',
      requiresAuth: false
    }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  }
})

router.beforeEach((to, _from, next) => {
  document.title = `${to.meta.title || '电力巡检点云中枢'} - UAVScan`
  next()
})

router.afterEach((to) => {
  console.log(`[Router] 导航到: ${to.path}`)
})

router.onError((error) => {
  console.error('[Router] 路由错误:', error)
  const uiStore = useUiStore()
  uiStore.addNotification({
    type: 'error',
    title: '路由错误',
    message: error.message
  })
})

export default router
