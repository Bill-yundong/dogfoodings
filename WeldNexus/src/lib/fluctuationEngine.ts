import { WeldPoolData, WeldPoint, FluctuationFeature, DefectRisk, WaveformPoint } from '@/types/welding';

export class AsyncFluctuationEngine {
  private samplingRate: number = 1000;
  private fftSize: number = 1024;
  private windowSize: number = 256;
  private overlap: number = 0.5;
  private featureHistory: FluctuationFeature[][] = [];
  private maxHistorySize: number = 100;

  constructor(samplingRate: number = 1000) {
    this.samplingRate = samplingRate;
  }

  private generateSimulationData(duration: number, hasDefect: boolean = false): WeldPoolData[] {
    const data: WeldPoolData[] = [];
    const sampleCount = Math.floor(duration * this.samplingRate / 1000);
    const baseTemp = 1500 + Math.random() * 200;
    const baseCurrent = 200 + Math.random() * 50;
    const baseVoltage = 25 + Math.random() * 5;

    for (let i = 0; i < sampleCount; i++) {
      const timestamp = Date.now() - (sampleCount - i) * (1000 / this.samplingRate);
      
      let tempNoise = Math.sin(i * 0.1) * 50 + (Math.random() - 0.5) * 30;
      let currentNoise = Math.sin(i * 0.15) * 10 + (Math.random() - 0.5) * 15;
      let voltageNoise = Math.sin(i * 0.12) * 2 + (Math.random() - 0.5) * 3;

      if (hasDefect && i > sampleCount * 0.6) {
        tempNoise += Math.sin(i * 0.5) * 100;
        currentNoise += Math.sin(i * 0.4) * 25;
        voltageNoise += Math.sin(i * 0.35) * 5;
      }

      data.push({
        id: `sim-${timestamp}-${i}`,
        timestamp,
        temperature: baseTemp + tempNoise,
        current: baseCurrent + currentNoise,
        voltage: baseVoltage + voltageNoise,
        wireFeedSpeed: 8 + Math.random() * 2,
        gasFlowRate: 15 + Math.random() * 3,
        poolWidth: 8 + Math.random() * 2,
        poolDepth: 3 + Math.random() * 1,
        oscillationFrequency: 50 + Math.random() * 10,
        oscillationAmplitude: 2 + Math.random() * 0.5,
      });
    }

    return data;
  }

  private applyHammingWindow(signal: number[]): number[] {
    return signal.map((value, index) => {
      const window = 0.54 - 0.46 * Math.cos((2 * Math.PI * index) / (signal.length - 1));
      return value * window;
    });
  }

  private computeFFT(signal: number[]): number[] {
    const n = signal.length;
    const magnitudes: number[] = [];
    const windowed = this.applyHammingWindow(signal);

    for (let k = 0; k < n / 2; k++) {
      let real = 0;
      let imag = 0;
      for (let t = 0; t < n; t++) {
        const angle = (2 * Math.PI * k * t) / n;
        real += windowed[t] * Math.cos(angle);
        imag -= windowed[t] * Math.sin(angle);
      }
      magnitudes.push(Math.sqrt(real * real + imag * imag) / n);
    }

    return magnitudes;
  }

  extractFluctuationFeatures(data: WeldPoolData[]): FluctuationFeature[] {
    if (data.length < this.windowSize) return [];

    const features: FluctuationFeature[] = [];
    const step = Math.floor(this.windowSize * (1 - this.overlap));

    for (let i = 0; i <= data.length - this.windowSize; i += step) {
      const window = data.slice(i, i + this.windowSize);
      const tempSignal = window.map(d => d.temperature);
      const fft = this.computeFFT(tempSignal);

      const harmonics: FluctuationFeature[] = [];
      const freqResolution = this.samplingRate / this.windowSize;

      for (let h = 1; h <= 5; h++) {
        const startIdx = Math.floor((h - 0.5) * 10 / freqResolution);
        const endIdx = Math.floor((h + 0.5) * 10 / freqResolution);
        const harmonicSlice = fft.slice(startIdx, Math.min(endIdx, fft.length));

        if (harmonicSlice.length > 0) {
          const maxAmp = Math.max(...harmonicSlice);
          const maxIdx = harmonicSlice.indexOf(maxAmp);
          const energy = harmonicSlice.reduce((a, b) => a + b * b, 0);

          harmonics.push({
            frequency: (startIdx + maxIdx) * freqResolution,
            amplitude: maxAmp,
            phase: 0,
            harmonic: h,
            energy,
          });
        }
      }

      features.push(...harmonics);
    }

    this.featureHistory.push(features);
    if (this.featureHistory.length > this.maxHistorySize) {
      this.featureHistory.shift();
    }

    return features;
  }

  calculateStabilityIndex(features: FluctuationFeature[]): number {
    if (features.length === 0) return 100;

    const harmonicEnergies = new Map<number, number[]>();
    features.forEach(f => {
      if (!harmonicEnergies.has(f.harmonic)) {
        harmonicEnergies.set(f.harmonic, []);
      }
      harmonicEnergies.get(f.harmonic)!.push(f.energy);
    });

    let stability = 100;
    const baseEnergy = harmonicEnergies.get(1)?.reduce((a, b) => a + b, 0) || 1;

    for (let h = 2; h <= 5; h++) {
      const harmonicEnergy = harmonicEnergies.get(h)?.reduce((a, b) => a + b, 0) || 0;
      const ratio = harmonicEnergy / baseEnergy;
      stability -= ratio * 50;
    }

    return Math.max(0, Math.min(100, stability));
  }

  predictDefectRisk(features: FluctuationFeature[], stabilityIndex: number): DefectRisk {
    const riskFactors: string[] = [];
    const recommendations: string[] = [];
    let probability = 0;

    const h3Energy = features.filter(f => f.harmonic === 3).reduce((a, b) => a + b.energy, 0);
    const h5Energy = features.filter(f => f.harmonic === 5).reduce((a, b) => a + b.energy, 0);

    if (stabilityIndex < 60) {
      probability += 40;
      riskFactors.push('高波动不稳定性');
      recommendations.push('检查焊丝进给速度');
    }

    if (h3Energy > 1000) {
      probability += 25;
      riskFactors.push('三次谐波异常');
      recommendations.push('检查保护气体流量');
    }

    if (h5Energy > 500) {
      probability += 20;
      riskFactors.push('五次谐波异常');
      recommendations.push('检查焊枪角度和距离');
    }

    if (this.featureHistory.length > 10) {
      const recentFeatures = this.featureHistory.slice(-10).flat();
      const trend = this.calculateFeatureTrend(recentFeatures);
      if (trend > 0.1) {
        probability += 15;
        riskFactors.push('波动趋势上升');
        recommendations.push('实时监控熔池状态');
      }
    }

    probability = Math.min(100, probability);

    let level: DefectRisk['level'] = 'none';
    if (probability >= 80) level = 'critical';
    else if (probability >= 60) level = 'high';
    else if (probability >= 40) level = 'medium';
    else if (probability >= 20) level = 'low';

    return { level, probability, types: riskFactors, recommendations };
  }

  private calculateFeatureTrend(features: FluctuationFeature[]): number {
    if (features.length < 2) return 0;
    
    const energies = features.map(f => f.energy);
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    const n = energies.length;

    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += energies[i];
      sumXY += i * energies[i];
      sumX2 += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope / (energies[0] || 1);
  }

  generateWaveformSlice(data: WeldPoolData[]): WaveformPoint[] {
    const waveform: WaveformPoint[] = [];

    data.forEach((d, i) => {
      waveform.push({ timestamp: d.timestamp, value: d.current, type: 'current' });
      waveform.push({ timestamp: d.timestamp, value: d.voltage, type: 'voltage' });
      waveform.push({ timestamp: d.timestamp, value: d.temperature, type: 'temperature' });
    });

    return waveform;
  }

  async simulateWeldFormation(duration: number = 3000, hasDefect: boolean = false): Promise<WeldPoint> {
    const data = this.generateSimulationData(duration, hasDefect);
    const features = this.extractFluctuationFeatures(data);
    const stabilityIndex = this.calculateStabilityIndex(features);
    const defectRisk = this.predictDefectRisk(features, stabilityIndex);
    const waveformSlice = this.generateWaveformSlice(data);

    const heatInput = data.reduce((sum, d) => sum + d.current * d.voltage * 0.001, 0) / data.length;

    const weldPoint: WeldPoint = {
      id: `wp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sequence: Date.now(),
      startTime: data[0].timestamp,
      endTime: data[data.length - 1].timestamp,
      qualityScore: stabilityIndex,
      defectRisk,
      waveformSlice,
      features: {
        stabilityIndex,
        heatInput,
        penetrationDepth: 2 + stabilityIndex * 0.03,
        beadWidth: 8 + (100 - stabilityIndex) * 0.05,
        spatterCount: Math.floor((100 - stabilityIndex) * 0.5),
        porosityLevel: Math.max(0, (100 - stabilityIndex) * 0.1),
      },
      robotStatus: {
        position: { x: Math.random() * 100, y: Math.random() * 100, z: 10 + Math.random() * 5 },
        speed: 5 + Math.random() * 2,
        torchAngle: 15 + Math.random() * 10,
        standoffDistance: 15 + Math.random() * 5,
      },
      qcAligned: true,
    };

    return weldPoint;
  }

  reset(): void {
    this.featureHistory = [];
  }
}

export const fluctuationEngine = new AsyncFluctuationEngine(1000);
