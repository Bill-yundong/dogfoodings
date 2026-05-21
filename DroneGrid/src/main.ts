import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'

window.addEventListener('error', (event) => {
  console.error('Global error:', event.error || event.message)
})

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason)
})

const app = createApp(App)
const pinia = createPinia()

app.config.errorHandler = (err, instance, info) => {
  console.error('Vue error:', err, info)
}

app.use(pinia)
app.mount('#app')
