class OpticalFlowEngine {
  constructor() {
    this.gridSize = 50
    this.maxFlow = 10
  }

  computeFlow(prevFrame, currFrame) {
    const flow = {
      u: new Array(prevFrame.length).fill(0),
      v: new Array(prevFrame.length).fill(0)
    }

    const gridSize = Math.sqrt(prevFrame.length)

    for (let y = 1; y < gridSize - 1; y++) {
      for (let x = 1; x < gridSize - 1; x++) {
        const idx = y * gridSize + x
        
        const Ix = this.computeGradientX(currFrame, x, y, gridSize)
        const Iy = this.computeGradientY(currFrame, x, y, gridSize)
        const It = currFrame[idx] - prevFrame[idx]

        const denominator = Ix * Ix + Iy * Iy + 0.001
        flow.u[idx] = (-Ix * It) / denominator
        flow.v[idx] = (-Iy * It) / denominator

        flow.u[idx] = Math.max(-this.maxFlow, Math.min(this.maxFlow, flow.u[idx]))
        flow.v[idx] = Math.max(-this.maxFlow, Math.min(this.maxFlow, flow.v[idx]))
      }
    }

    return flow
  }

  computeGradientX(frame, x, y, gridSize) {
    const left = frame[y * gridSize + (x - 1)]
    const right = frame[y * gridSize + (x + 1)]
    return (right - left) / 2
  }

  computeGradientY(frame, x, y, gridSize) {
    const top = frame[(y - 1) * gridSize + x]
    const bottom = frame[(y + 1) * gridSize + x]
    return (bottom - top) / 2
  }

  extrapolate(frame, flow, steps = 1) {
    const gridSize = Math.sqrt(frame.length)
    let extrapolated = [...frame]

    for (let step = 0; step < steps; step++) {
      const nextFrame = new Array(frame.length).fill(0)

      for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
          const idx = y * gridSize + x
          
          const srcX = x - flow.u[idx] * (step + 1)
          const srcY = y - flow.v[idx] * (step + 1)

          const x0 = Math.floor(srcX)
          const y0 = Math.floor(srcY)
          const x1 = x0 + 1
          const y1 = y0 + 1

          if (x0 >= 0 && x1 < gridSize && y0 >= 0 && y1 < gridSize) {
            const fx = srcX - x0
            const fy = srcY - y0

            const v00 = extrapolated[y0 * gridSize + x0]
            const v10 = extrapolated[y0 * gridSize + x1]
            const v01 = extrapolated[y1 * gridSize + x0]
            const v11 = extrapolated[y1 * gridSize + x1]

            nextFrame[idx] = this.bilinearInterpolation(v00, v10, v01, v11, fx, fy)
          } else {
            nextFrame[idx] = extrapolated[idx] * 0.9
          }
        }
      }

      extrapolated = nextFrame
    }

    return extrapolated
  }

  bilinearInterpolation(v00, v10, v01, v11, fx, fy) {
    const top = v00 * (1 - fx) + v10 * fx
    const bottom = v01 * (1 - fx) + v11 * fx
    return top * (1 - fy) + bottom * fy
  }
}

const engine = new OpticalFlowEngine()

self.onmessage = (e) => {
  const { type, data } = e.data

  switch (type) {
    case 'computeForecast':
      const { radarFrames, forecastMinutes } = data
      const results = []

      if (radarFrames.length >= 2) {
        const flow = engine.computeFlow(radarFrames[radarFrames.length - 2], radarFrames[radarFrames.length - 1])

        for (let i = 1; i <= forecastMinutes; i++) {
          const forecast = engine.extrapolate(radarFrames[radarFrames.length - 1], flow, i)
          results.push({
            minute: i,
            data: forecast,
            timestamp: Date.now() + i * 60 * 1000
          })
        }
      }

      self.postMessage({
        type: 'forecastComplete',
        data: results
      })
      break

    case 'ping':
      self.postMessage({ type: 'pong' })
      break
  }
}
