export class FFT {
  private n: number
  private log2n: number
  private cosTable: Float32Array
  private sinTable: Float32Array

  constructor(size: number) {
    this.n = size
    this.log2n = Math.log2(size)
    this.cosTable = new Float32Array(size / 2)
    this.sinTable = new Float32Array(size / 2)

    for (let i = 0; i < size / 2; i++) {
      this.cosTable[i] = Math.cos((-2 * Math.PI * i) / size)
      this.sinTable[i] = Math.sin((-2 * Math.PI * i) / size)
    }
  }

  transform(real: Float32Array, imag: Float32Array): void {
    const n = this.n
    const log2n = this.log2n

    let j = 0
    for (let i = 1; i < n - 1; i++) {
      let bit = n >> 1
      for (; j & bit; bit >>= 1) {
        j ^= bit
      }
      j ^= bit
      if (i < j) {
        let temp = real[i]
        real[i] = real[j]
        real[j] = temp
        temp = imag[i]
        imag[i] = imag[j]
        imag[j] = temp
      }
    }

    let size = 2
    while (size <= n) {
      const halfsize = size / 2
      const tablestep = n / size
      for (let i = 0; i < n; i += size) {
        let k = 0
        for (let l = i; l < i + halfsize; l++) {
          const tpre = real[l + halfsize] * this.cosTable[k] - imag[l + halfsize] * this.sinTable[k]
          const tpim = real[l + halfsize] * this.sinTable[k] + imag[l + halfsize] * this.cosTable[k]
          real[l + halfsize] = real[l] - tpre
          imag[l + halfsize] = imag[l] - tpim
          real[l] += tpre
          imag[l] += tpim
          k += tablestep
        }
      }
      size *= 2
    }
  }

  getSpectrum(data: Float32Array): { frequencies: number[], amplitudes: number[] } {
    const n = this.n
    const real = new Float32Array(n)
    const imag = new Float32Array(n)

    for (let i = 0; i < n; i++) {
      real[i] = data[i] || 0
      imag[i] = 0
    }

    this.transform(real, imag)

    const frequencies: number[] = []
    const amplitudes: number[] = []
    const halfN = n / 2

    for (let i = 0; i < halfN; i++) {
      const amp = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]) / (n / 2)
      amplitudes.push(amp)
      frequencies.push(i)
    }

    return { frequencies, amplitudes }
  }
}

export function nextPowerOf2(n: number): number {
  return Math.pow(2, Math.ceil(Math.log2(n)))
}
