import { LeakageCurrentData, FrequencyDomainFeatures, TimeDomainFeatures, CombinedFeatures } from '@/types';

export class FrequencyAnalyzer {
  private samplingRate: number;

  constructor(samplingRate: number = 1000) {
    this.samplingRate = samplingRate;
  }

  async analyzeAsync(data: LeakageCurrentData): Promise<CombinedFeatures> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const timeFeatures = this.extractTimeDomainFeatures(data.rawData);
        const frequencyFeatures = this.extractFrequencyDomainFeatures(data.rawData);
        resolve({ timeDomain: timeFeatures, frequencyDomain: frequencyFeatures });
      }, 0);
    });
  }

  private extractTimeDomainFeatures(signal: number[]): TimeDomainFeatures {
    const n = signal.length;
    if (n === 0) {
      return {
        peakValue: 0,
        rmsValue: 0,
        meanValue: 0,
        variance: 0,
        skewness: 0,
        kurtosis: 0,
        pulseCount: 0
      };
    }
    
    const mean = signal.reduce((a, b) => a + b, 0) / n;
    const variance = signal.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);
    
    const squared = signal.map(x => x * x);
    const rms = Math.sqrt(squared.reduce((a, b) => a + b, 0) / n);
    const peak = Math.max(...signal.map(Math.abs).filter(m => isFinite(m)));
    
    let skewness = 0;
    let kurtosis = 0;
    if (stdDev > 0) {
      skewness = signal.reduce((a, b) => a + Math.pow((b - mean) / stdDev, 3), 0) / n;
      kurtosis = signal.reduce((a, b) => a + Math.pow((b - mean) / stdDev, 4), 0) / n - 3;
    }
    
    const threshold = rms * 2;
    let pulseCount = 0;
    for (let i = 1; i < n; i++) {
      if (Math.abs(signal[i]) > threshold && Math.abs(signal[i-1]) <= threshold) {
        pulseCount++;
      }
    }

    return {
      peakValue: isFinite(peak) ? peak : 0,
      rmsValue: isFinite(rms) ? rms : 0,
      meanValue: isFinite(mean) ? mean : 0,
      variance: isFinite(variance) ? variance : 0,
      skewness: isFinite(skewness) ? skewness : 0,
      kurtosis: isFinite(kurtosis) ? kurtosis : 0,
      pulseCount
    };
  }

  private extractFrequencyDomainFeatures(signal: number[]): FrequencyDomainFeatures {
    const paddedSignal = this.padToPowerOfTwo(signal);
    const fft = this.performFFT(paddedSignal);
    const magnitude = fft.map(c => Math.sqrt((c?.real || 0) * (c?.real || 0) + (c?.imag || 0) * (c?.imag || 0)));
    
    const n = paddedSignal.length;
    const fundamentalIndex = Math.floor(50 * n / this.samplingRate);
    const fundamentalFreq = 50;
    const fundamentalMagnitude = magnitude[fundamentalIndex] || 1;
    
    const harmonicRatios: number[] = [];
    let harmonicSum = 0;
    for (let h = 2; h <= 10; h++) {
      const idx = Math.floor(h * fundamentalFreq * n / this.samplingRate);
      if (idx < n / 2 && magnitude[idx] !== undefined) {
        const ratio = magnitude[idx] / fundamentalMagnitude;
        harmonicRatios.push(ratio);
        harmonicSum += magnitude[idx] * magnitude[idx];
      }
    }
    
    const thd = fundamentalMagnitude > 0 ? Math.sqrt(harmonicSum) / fundamentalMagnitude : 0;
    
    const magnitudeSlice = magnitude.slice(1, Math.floor(n / 2));
    const maxValue = Math.max(...magnitudeSlice.filter(m => isFinite(m)));
    const peakFreq = magnitude.indexOf(maxValue);
    
    const validMagnitudes = magnitude.filter(m => isFinite(m));
    const rmsFreq = validMagnitudes.length > 0 
      ? Math.sqrt(validMagnitudes.reduce((a, b) => a + b * b, 0) / validMagnitudes.length) 
      : 0;
    const crestFactorFreq = rmsFreq > 0 ? (magnitude[peakFreq] || 0) / rmsFreq : 0;
    
    const spectrumSum = magnitude.slice(0, Math.floor(n / 2)).reduce((a, b) => a + (b || 0), 0);
    const normalizedSpectrum = magnitude.slice(0, Math.floor(n / 2)).map(m => spectrumSum > 0 ? (m || 0) / spectrumSum : 0);
    const spectralEntropy = -normalizedSpectrum.reduce((a, p) => a + (p > 0 && isFinite(p) ? p * Math.log2(p) : 0), 0);

    return {
      fundamentalFrequency: fundamentalFreq,
      harmonicRatios,
      totalHarmonicDistortion: isFinite(thd) ? thd : 0,
      peakValue: isFinite(magnitude[peakFreq]) ? magnitude[peakFreq] : 0,
      rmsValue: isFinite(rmsFreq) ? rmsFreq : 0,
      crestFactor: isFinite(crestFactorFreq) ? crestFactorFreq : 0,
      spectralEntropy: isFinite(spectralEntropy) ? spectralEntropy : 0
    };
  }

  private padToPowerOfTwo(signal: number[]): number[] {
    const n = signal.length;
    const nextPower = Math.pow(2, Math.ceil(Math.log2(n)));
    const padded = [...signal];
    while (padded.length < nextPower) {
      padded.push(0);
    }
    return padded;
  }

  private performFFT(signal: number[]): Array<{ real: number; imag: number }> {
    const n = signal.length;
    if (n <= 1) return [{ real: signal[0] || 0, imag: 0 }];

    const even: number[] = [];
    const odd: number[] = [];
    for (let i = 0; i < n; i++) {
      if (i % 2 === 0) even.push(signal[i]);
      else odd.push(signal[i]);
    }

    const fftEven = this.performFFT(even);
    const fftOdd = this.performFFT(odd);

    const result: Array<{ real: number; imag: number }> = new Array(n).fill({ real: 0, imag: 0 });
    for (let k = 0; k < n / 2; k++) {
      const evenVal = fftEven[k] || { real: 0, imag: 0 };
      const oddVal = fftOdd[k] || { real: 0, imag: 0 };
      
      const angle = -2 * Math.PI * k / n;
      const cosAngle = Math.cos(angle);
      const sinAngle = Math.sin(angle);
      
      const t = {
        real: cosAngle * (oddVal.real || 0) - sinAngle * (oddVal.imag || 0),
        imag: sinAngle * (oddVal.real || 0) + cosAngle * (oddVal.imag || 0)
      };
      
      result[k] = {
        real: (evenVal.real || 0) + t.real,
        imag: (evenVal.imag || 0) + t.imag
      };
      result[k + n / 2] = {
        real: (evenVal.real || 0) - t.real,
        imag: (evenVal.imag || 0) - t.imag
      };
    }

    return result;
  }

  async analyzeBatch(data: LeakageCurrentData[]): Promise<Map<string, CombinedFeatures>> {
    const results = new Map<string, CombinedFeatures>();
    for (const item of data) {
      const features = await this.analyzeAsync(item);
      results.set(item.id, features);
    }
    return results;
  }
}

export function createLeakageCurrentData(
  insulatorId: string, 
  duration: number = 1, 
  samplingRate: number = 1000
): LeakageCurrentData {
  const n = duration * samplingRate;
  const rawData: number[] = [];
  
  for (let i = 0; i < n; i++) {
    const t = i / samplingRate;
    const fundamental = Math.sin(2 * Math.PI * 50 * t);
    const harmonic3 = 0.3 * Math.sin(2 * Math.PI * 150 * t);
    const harmonic5 = 0.15 * Math.sin(2 * Math.PI * 250 * t);
    const noise = (Math.random() - 0.5) * 0.1;
    rawData.push(fundamental + harmonic3 + harmonic5 + noise);
  }

  return {
    id: `lc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    insulatorId,
    timestamp: Date.now(),
    rawData,
    samplingRate
  };
}