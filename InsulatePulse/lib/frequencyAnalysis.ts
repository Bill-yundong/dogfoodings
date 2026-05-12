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
    const mean = signal.reduce((a, b) => a + b, 0) / n;
    const variance = signal.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);
    
    const squared = signal.map(x => x * x);
    const rms = Math.sqrt(squared.reduce((a, b) => a + b, 0) / n);
    const peak = Math.max(...signal.map(Math.abs));
    
    const skewness = signal.reduce((a, b) => a + Math.pow((b - mean) / stdDev, 3), 0) / n;
    const kurtosis = signal.reduce((a, b) => a + Math.pow((b - mean) / stdDev, 4), 0) / n - 3;
    
    const threshold = rms * 2;
    let pulseCount = 0;
    for (let i = 1; i < n; i++) {
      if (Math.abs(signal[i]) > threshold && Math.abs(signal[i-1]) <= threshold) {
        pulseCount++;
      }
    }

    return {
      peakValue: peak,
      rmsValue: rms,
      meanValue: mean,
      variance,
      skewness,
      kurtosis,
      pulseCount
    };
  }

  private extractFrequencyDomainFeatures(signal: number[]): FrequencyDomainFeatures {
    const fft = this.performFFT(signal);
    const magnitude = fft.map(c => Math.sqrt(c.real * c.real + c.imag * c.imag));
    
    const n = signal.length;
    const fundamentalIndex = Math.floor(50 * n / this.samplingRate);
    const fundamentalFreq = 50;
    const fundamentalMagnitude = magnitude[fundamentalIndex];
    
    const harmonicRatios: number[] = [];
    let harmonicSum = 0;
    for (let h = 2; h <= 10; h++) {
      const idx = Math.floor(h * fundamentalFreq * n / this.samplingRate);
      if (idx < n / 2) {
        const ratio = magnitude[idx] / fundamentalMagnitude;
        harmonicRatios.push(ratio);
        harmonicSum += magnitude[idx] * magnitude[idx];
      }
    }
    
    const thd = Math.sqrt(harmonicSum) / fundamentalMagnitude;
    
    const peakFreq = magnitude.indexOf(Math.max(...magnitude.slice(1, Math.floor(n / 2))));
    
    const rmsFreq = Math.sqrt(magnitude.reduce((a, b) => a + b * b, 0) / (n / 2));
    const crestFactorFreq = magnitude[peakFreq] / rmsFreq;
    
    const normalizedSpectrum = magnitude.slice(0, Math.floor(n / 2)).map(m => m / magnitude.slice(0, Math.floor(n / 2)).reduce((a, b) => a + b, 0));
    const spectralEntropy = -normalizedSpectrum.reduce((a, p) => a + (p > 0 ? p * Math.log2(p) : 0), 0);

    return {
      fundamentalFrequency: fundamentalFreq,
      harmonicRatios,
      totalHarmonicDistortion: thd,
      peakValue: magnitude[peakFreq],
      rmsValue: rmsFreq,
      crestFactor: crestFactorFreq,
      spectralEntropy
    };
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

    const result: Array<{ real: number; imag: number }> = [];
    for (let k = 0; k < n / 2; k++) {
      const t = {
        real: Math.cos(-2 * Math.PI * k / n) * fftOdd[k].real - Math.sin(-2 * Math.PI * k / n) * fftOdd[k].imag,
        imag: Math.sin(-2 * Math.PI * k / n) * fftOdd[k].real + Math.cos(-2 * Math.PI * k / n) * fftOdd[k].imag
      };
      result[k] = {
        real: fftEven[k].real + t.real,
        imag: fftEven[k].imag + t.imag
      };
      result[k + n / 2] = {
        real: fftEven[k].real - t.real,
        imag: fftEven[k].imag - t.imag
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