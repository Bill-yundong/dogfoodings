export interface WaveletResult {
  scales: number[]
  times: number[]
  coefficients: number[][]
}

export class WaveletTransform {
  private morlet(f: number, t: number, scale: number): number {
    const sigma = 1.0
    const omega0 = 5.0
    const tNorm = t / scale
    const gauss = Math.exp(-0.5 * Math.pow((tNorm - f * scale) / sigma, 2))
    const cosine = Math.cos(omega0 * (tNorm - f * scale))
    return (1 / Math.sqrt(scale)) * gauss * cosine
  }

  private morletWavelet(t: number, scale: number, omega0: number = 5.0): number {
    const tNorm = t / scale
    return Math.pow(Math.PI, -0.25) * Math.exp(-0.5 * tNorm * tNorm) * Math.cos(omega0 * tNorm)
  }

  async cwt(signal: Float32Array, samplingRate: number, numScales: number = 32): Promise<WaveletResult> {
    const n = signal.length
    const scales = this.generateScales(numScales, samplingRate)
    const times: number[] = []
    const coefficients: number[][] = []

    for (let i = 0; i < n; i++) {
      times.push(i / samplingRate)
    }

    for (let s = 0; s < numScales; s++) {
      const scale = scales[s]
      const coeffRow: number[] = []

      for (let t = 0; t < n; t++) {
        let sum = 0
        const waveletLen = Math.min(Math.floor(10 * scale), n)
        const halfLen = Math.floor(waveletLen / 2)

        for (let k = -halfLen; k < halfLen; k++) {
          const idx = t + k
          if (idx >= 0 && idx < n) {
            const waveletVal = this.morletWavelet(k, scale)
            sum += signal[idx] * waveletVal
          }
        }
        coeffRow.push(Math.abs(sum))
      }
      coefficients.push(coeffRow)
    }

    return { scales, times, coefficients }
  }

  private generateScales(numScales: number, samplingRate: number): number[] {
    const scales: number[] = []
    const minScale = 1
    const maxScale = samplingRate / 2

    for (let i = 0; i < numScales; i++) {
      const scale = minScale * Math.pow(maxScale / minScale, i / (numScales - 1))
      scales.push(scale)
    }

    return scales
  }

  extractFeatures(coefficients: number[][]): { energy: number[], entropy: number[], peaks: number[] } {
    const numScales = coefficients.length
    const numTimes = coefficients[0]?.length || 0
    const energy: number[] = []
    const entropy: number[] = []
    const peaks: number[] = []

    for (let s = 0; s < numScales; s++) {
      let scaleEnergy = 0
      let scaleEntropy = 0
      let maxVal = 0

      for (let t = 0; t < numTimes; t++) {
        const val = coefficients[s][t]
        scaleEnergy += val * val
        if (val > 0) {
          scaleEntropy -= val * Math.log(val)
        }
        if (val > maxVal) {
          maxVal = val
        }
      }

      energy.push(scaleEnergy / numTimes)
      entropy.push(scaleEntropy / numTimes)
      peaks.push(maxVal)
    }

    return { energy, entropy, peaks }
  }
}

export async function asyncWaveletTransform(
  signal: Float32Array,
  samplingRate: number,
  numScales: number = 32
): Promise<WaveletResult> {
  const wavelet = new WaveletTransform()
  return wavelet.cwt(signal, samplingRate, numScales)
}
