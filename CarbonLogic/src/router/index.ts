import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('@/views/Dashboard.vue')
  },
  {
    path: '/emissions',
    name: 'Emissions',
    component: () => import('@/views/Emissions.vue')
  },
  {
    path: '/supply-chain',
    name: 'SupplyChain',
    component: () => import('@/views/SupplyChain.vue')
  },
  {
    path: '/lca',
    name: 'LCA',
    component: () => import('@/views/LCA.vue')
  },
  {
    path: '/simulation',
    name: 'Simulation',
    component: () => import('@/views/Simulation.vue')
  },
  {
    path: '/targets',
    name: 'Targets',
    component: () => import('@/views/Targets.vue')
  },
  {
    path: '/audit',
    name: 'Audit',
    component: () => import('@/views/Audit.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
