import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/simulation'
  },
  {
    path: '/simulation',
    name: 'Simulation',
    component: () => import('../views/SimulationView.vue')
  },
  {
    path: '/database',
    name: 'Database',
    component: () => import('../views/DatabaseView.vue')
  },
  {
    path: '/collaboration',
    name: 'Collaboration',
    component: () => import('../views/CollaborationView.vue')
  },
  {
    path: '/analysis',
    name: 'Analysis',
    component: () => import('../views/AnalysisView.vue')
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
