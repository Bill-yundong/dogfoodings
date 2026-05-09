import App from './App.svelte'
import { mount } from 'svelte'

// 确保 DOM 加载完成后再挂载
window.addEventListener('DOMContentLoaded', () => {
  mount(App, { target: document.getElementById('app') })
})