export class ForecastEngine {
  constructor() {
    this.worker = null
    this.isProcessing = false
    this.queue = []
    this.listeners = new Map()
  }

  init() {
    if (this.worker) return Promise.resolve()
    
    return new Promise((resolve, reject) => {
      try {
        this.worker = new Worker(new URL('../workers/opticalFlowWorker.js', import.meta.url), {
          type: 'module'
        })
        
        this.worker.onmessage = (e) => {
          this.handleWorkerMessage(e)
        }
        
        this.worker.onerror = (error) => {
          console.error('Worker error:', error)
          reject(error)
        }
        
        this.worker.postMessage({ type: 'ping' })
        
        const timeout = setTimeout(() => {
          resolve()
        }, 100)
        
        this.listeners.set('pong', () => {
          clearTimeout(timeout)
          resolve()
        })
      } catch (error) {
        reject(error)
      }
    })
  }

  handleWorkerMessage(e) {
    const { type, data } = e.data
    
    const callback = this.listeners.get(type)
    if (callback) {
      callback(data)
      this.listeners.delete(type)
    }
    
    if (type === 'forecastComplete') {
      this.isProcessing = false
      this.processQueue()
    }
  }

  processQueue() {
    if (this.queue.length > 0 && !this.isProcessing) {
      const request = this.queue.shift()
      this.computeForecast(request.radarFrames, request.forecastMinutes, request.callback)
    }
  }

  computeForecast(radarFrames, forecastMinutes, callback) {
    if (!this.worker) {
      this.init().then(() => {
        this.computeForecast(radarFrames, forecastMinutes, callback)
      })
      return
    }

    if (this.isProcessing) {
      this.queue.push({ radarFrames, forecastMinutes, callback })
      return
    }

    this.isProcessing = true
    this.listeners.set('forecastComplete', callback)
    
    this.worker.postMessage({
      type: 'computeForecast',
      data: { 
        radarFrames: radarFrames.map(frame => [...frame]), 
        forecastMinutes 
      }
    })
  }

  destroy() {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }
    this.queue = []
    this.listeners.clear()
  }
}

export function generateMockRadarData(gridSize = 50, frames = 10) {
  const allFrames = []
  const centerX = Math.floor(gridSize / 2)
  const centerY = Math.floor(gridSize / 2)
  
  for (let frame = 0; frame < frames; frame++) {
    const data = new Array(gridSize * gridSize).fill(0)
    const offsetX = centerX + Math.sin(frame * 0.3) * 10
    const offsetY = centerY + Math.cos(frame * 0.2) * 8
    
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const dx = x - offsetX
        const dy = y - offsetY
        const dist = Math.sqrt(dx * dx + dy * dy)
        const maxDist = 15
        
        if (dist < maxDist) {
          const intensity = (1 - dist / maxDist) * 50
          data[y * gridSize + x] = Math.max(0, intensity + Math.random() * 10)
        }
      }
    }
    
    allFrames.push(data)
  }
  
  return allFrames
}
