import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

function addDebugLog(message: string, type: 'log' | 'error' | 'warn' = 'log') {
  const panel = document.getElementById('debug-panel');
  if (panel) {
    const div = document.createElement('div');
    div.className = `debug-log ${type}`;
    div.textContent = message;
    panel.appendChild(div);
    panel.scrollTop = panel.scrollHeight;
  }
  console[type](message);
}

addDebugLog('=== WaveNexus Main Starting ===', 'log');

const rootElement = document.getElementById('root');
addDebugLog(`Root element: ${rootElement ? 'FOUND' : 'MISSING'}`, rootElement ? 'log' : 'error');

if (!rootElement) {
  addDebugLog('ERROR: Root element not found!', 'error');
  document.body.innerHTML += '<div style="color: red; padding: 20px;">ERROR: Root element not found</div>';
} else {
  try {
    addDebugLog('Creating root and rendering...', 'log');
    
    createRoot(rootElement).render(
      <StrictMode>
        <div style={{
          minHeight: '100vh',
          background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
          padding: '20px',
          color: 'white',
        }}>
          <h1>🌊 WaveNexus - 系统启动中</h1>
          <p>正在加载核心模块，请稍候...</p>
          <div id="app-container"></div>
        </div>
      </StrictMode>,
    );
    
    addDebugLog('=== Initial render complete ===', 'log');
    
    setTimeout(async () => {
      addDebugLog('=== Loading full App module ===', 'log');
      try {
        const { default: App } = await import('./App.tsx');
        addDebugLog('App module loaded', 'log');
        
        const { ErrorBoundary } = await import('./components/ErrorBoundary.tsx');
        addDebugLog('ErrorBoundary loaded', 'log');
        
        const container = document.getElementById('app-container');
        if (container) {
          addDebugLog('Rendering full App...', 'log');
          createRoot(container).render(
            <StrictMode>
              <ErrorBoundary>
                <App />
              </ErrorBoundary>
            </StrictMode>
          );
          addDebugLog('=== Full App rendered successfully ===', 'log');
        } else {
          addDebugLog('ERROR: app-container not found', 'error');
        }
      } catch (e) {
        addDebugLog(`Error loading App: ${e}`, 'error');
        console.error(e);
      }
    }, 500);
  } catch (e) {
    addDebugLog(`Fatal error during render: ${e}`, 'error');
    console.error(e);
  }
}