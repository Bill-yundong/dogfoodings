import './app.css';
import App from './App.svelte';
import { mount } from 'svelte';
import { initDB } from '@/db';

async function bootstrap() {
  try {
    await initDB();
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
  
  const app = mount(App, {
    target: document.getElementById('app')!
  });
  
  return app;
}

export default bootstrap();
