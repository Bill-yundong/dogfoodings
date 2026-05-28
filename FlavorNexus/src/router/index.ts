import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/HomeView.vue')
  },
  {
    path: '/taste-coordinate',
    name: 'taste-coordinate',
    component: () => import('@/views/TasteCoordinateView.vue')
  },
  {
    path: '/maillard',
    name: 'maillard',
    component: () => import('@/views/MaillardView.vue')
  },
  {
    path: '/workshop',
    name: 'workshop',
    component: () => import('@/views/WorkshopView.vue')
  },
  {
    path: '/planner',
    name: 'planner',
    component: () => import('@/views/PlannerView.vue')
  },
  {
    path: '/data-center',
    name: 'data-center',
    component: () => import('@/views/DataCenterView.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
