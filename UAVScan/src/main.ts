import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './styles/main.scss'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

app.mount('#app')

console.log('%c⚡ UAVScan PointCloud Hub', 'color: #00d4ff; font-size: 20px; font-weight: bold;')
console.log('%c电力巡检无人机激光点云实时降维中枢系统已启动', 'color: #8892b0; font-size: 14px;')
console.log('%cVue 3 + TypeScript + WebGL + IndexedDB + Web Workers', 'color: #5a6578; font-size: 12px;')
