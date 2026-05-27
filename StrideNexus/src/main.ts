import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

import App from './App.vue'
import router from './router'
import { initDB } from './database'
import { syncService } from './services/syncService'

import './styles/global.scss'

async function bootstrap() {
  const app = createApp(App)

  for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(key, component)
  }

  app.use(createPinia())
  app.use(router)
  app.use(ElementPlus)

  try {
    await initDB()
    console.log('IndexedDB initialized successfully')
    await syncService.init()
  } catch (error) {
    console.error('Failed to initialize database:', error)
  }

  app.mount('#app')
}

bootstrap()
