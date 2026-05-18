import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { VibrationSignal, WaveletResult } from '@/types'
import { FFT, nextPowerOf2 } from '@/algorithms/fft'
import { asyncWaveletTransform } from '@/algorithms/wavelet'
import { cavitationModel } from '@/algorithms/cavitation'
import { addSignal, getLatestSignal, getSignalsByDevice } from '@/database/signalStore'

export const useSignalStore = defineStore('signal', () => {
  const currentSignal = ref<VibrationSignal | null>(null)
  const signals = ref<VibrationSignal[]>([])
  const waveletResult = ref<WaveletResult | null>(null)
  const processing = ref(false)
  const processingProgress = ref(0)

  function generateMockSignal(samplingRate: number, duration: number, hasCavitation: boolean = false): Float32Array {
    const n = samplingRate * duration
    const data = new Float32Array(n)
    const dt = 1 / samplingRate

    const rotFreq = 25
    const vaneFreq = rotFreq * 6

    for (let i = 0; i < n; i++) {
      const t = i * dt
      let val = 0

      val += Math.sin(2 * Math.PI * rotFreq * t) * 2
      val += Math.sin(2 * Math.PI * vaneFreq * t) * 1.5
      val += Math.sin(2 * Math.PI * vaneFreq * 2 * t) * 0.8
      val += Math.sin(2 * Math.PI * vaneFreq * 3 * t) * 0.4

      if (hasCavitation) {
        val += (Math.random() - 0.5) * 3
        const cavitationFreq = 150 + Math.random() * 200
        val += Math.sin(2 * Math.PI * cavitationFreq * t) * Math.exp(-Math.pow(t - duration/2, 2) * 4) * 2
      }

      val += (Math.random() - 0.5) * 0.5
      data[i] = val
    }

    return data
  }

  function extractFeatures(rawData: Float32Array, samplingRate: number) {
    const n = rawData.length
    let sum = 0
    let sumSq = 0
    let peak = 0

    for (let i = 0; i < n; i++) {
      const val = rawData[i]
      sum += val
      sumSq += val * val
      if (Math.abs(val) > peak) peak = Math.abs(val)
    }

    const mean = sum / n
    const rms = Math.sqrt(sumSq / n)
    const crestFactor = rms > 0 ? peak / rms : 0

    let sum3 = 0
    let sum4 = 0
    for (let i = 0; i < n; i++) {
      const centered = rawData[i] - mean
      sum3 += Math.pow(centered, 3)
      sum4 += Math.pow(centered, 4)
    }

    const variance = sumSq / n - mean * mean
    const std = Math.sqrt(variance)
    const skewness = std > 0 ? (sum3 / n) / Math.pow(std, 3) : 0
    const kurtosis = variance > 0 ? (sum4 / n) / Math.pow(variance, 2) : 0

    const fftSize = nextPowerOf2(n)
    const fft = new FFT(fftSize)
    const paddedData = new Float32Array(fftSize)
    paddedData.set(rawData)
    const { amplitudes } = fft.getSpectrum(paddedData)

    let peakIdx = 0
    let peakAmp = 0
    for (let i = 0; i < amplitudes.length; i++) {
      if (amplitudes[i] > peakAmp) {
        peakAmp = amplitudes[i]
        peakIdx = i
      }
    }

    const peakFrequency = (peakIdx * samplingRate) / fftSize
    const vaneFreq = 150
    const harmonicStart = Math.floor((vaneFreq * 0.5 * fftSize) / samplingRate)
    const harmonicEnd = Math.floor((vaneFreq * 5 * fftSize) / samplingRate)
    let harmonicEnergy = 0
    let totalEnergy = 0

    for (let i = 0; i < amplitudes.length; i++) {
      totalEnergy += amplitudes[i] * amplitudes[i]
      if (i >= harmonicStart && i <= harmonicEnd) {
        harmonicEnergy += amplitudes[i] * amplitudes[i]
      }
    }

    const harmonicRatio = totalEnergy > 0 ? harmonicEnergy / totalEnergy : 0

    return {
      rms,
      peak,
      crestFactor,
      kurtosis,
      skewness,
      peakFrequency,
      harmonicRatio
    }
  }

  async function processSignal(deviceId: string, rawData: Float32Array, samplingRate: number) {
    processing.value = true
    processingProgress.value = 0

    try {
      const duration = rawData.length / samplingRate

      processingProgress.value = 20
      const fftSize = nextPowerOf2(rawData.length)
      const fft = new FFT(fftSize)
      const paddedData = new Float32Array(fftSize)
      paddedData.set(rawData)
      const frequencyDomain = fft.getSpectrum(paddedData)

      processingProgress.value = 50
      const wavelet = await asyncWaveletTransform(rawData.slice(0, Math.min(2048, rawData.length)), samplingRate, 16)
      waveletResult.value = wavelet

      processingProgress.value = 80
      const signal: VibrationSignal = {
        id: `sig-${Date.now()}`,
        deviceId,
        sensorId: `sen-${deviceId}-01`,
        timestamp: Date.now(),
        samplingRate,
        duration,
        rawData: rawData.slice(0, 4096),
        frequencyDomain,
        waveletResult: []
      }

      await addSignal(signal)
      currentSignal.value = signal

      processingProgress.value = 100
      return signal
    } finally {
      processing.value = false
    }
  }

  async function loadSignals(deviceId: string, limit?: number) {
    signals.value = await getSignalsByDevice(deviceId, limit)
  }

  async function loadLatestSignal(deviceId: string) {
    currentSignal.value = await getLatestSignal(deviceId) || null
  }

  function evaluateCavitationRisk(rawData: Float32Array, samplingRate: number) {
    const features = extractFeatures(rawData, samplingRate)
    return cavitationModel.evaluate(features, waveletResult.value || undefined)
  }

  return {
    currentSignal,
    signals,
    waveletResult,
    processing,
    processingProgress,
    generateMockSignal,
    extractFeatures,
    processSignal,
    loadSignals,
    loadLatestSignal,
    evaluateCavitationRisk
  }
})
