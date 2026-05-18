import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: MainLayout,
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/DashboardView.vue'),
        meta: { title: '总览仪表盘', icon: 'Odometer' }
      },
      {
        path: 'devices',
        name: 'Devices',
        component: () => import('@/views/DeviceListView.vue'),
        meta: { title: '设备管理', icon: 'Cpu' }
      },
      {
        path: 'devices/:id',
        name: 'DeviceDetail',
        component: () => import('@/views/DeviceDetailView.vue'),
        meta: { title: '设备详情', icon: 'Cpu', hidden: true }
      },
      {
        path: 'spectrum',
        name: 'Spectrum',
        component: () => import('@/views/SpectrumAnalysisView.vue'),
        meta: { title: '频谱分析', icon: 'TrendCharts' }
      },
      {
        path: 'prediction',
        name: 'Prediction',
        component: () => import('@/views/CavitationPredictionView.vue'),
        meta: { title: '风险预测', icon: 'Warning' }
      },
      {
        path: 'fault-simulation',
        name: 'FaultSimulation',
        component: () => import('@/views/FaultChainSimulationView.vue'),
        meta: { title: '故障模拟', icon: 'Connection' }
      },
      {
        path: 'snapshots',
        name: 'Snapshots',
        component: () => import('@/views/HealthSnapshotView.vue'),
        meta: { title: '健康快照', icon: 'Camera' }
      },
      {
        path: 'alerts',
        name: 'Alerts',
        component: () => import('@/views/AlertCenterView.vue'),
        meta: { title: '预警中心', icon: 'Bell' }
      },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('@/views/SystemSettingsView.vue'),
        meta: { title: '系统配置', icon: 'Setting' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
