import type { EnergyReading, DeviceReading, LoadFeature, WastePattern, Device } from '@/lib/types/energy';
import { mean, stdDev, skewness, kurtosis, slope, cosineSimilarity, normalize, fft, detectAnomalies } from '@/lib/utils/math';
import { eventBus } from '@/lib/bus/eventBus';
import { dbService } from '@/lib/db/indexedDB';
import { generateWastePatterns } from '@/lib/utils/mockData';

class LoadRecognizer {
  private dataWindow: Map<string, EnergyReading[]> = new Map();
  private patterns: WastePattern[] = [];
  private isRunning: boolean = false;
  private analysisInterval: number = 10000;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private maxWindowSize: number = 60;
  private anomalyThreshold: number = 2.5;
  private devices: Device[] = [];

  async init(devices: Device[]): Promise<void> {
    this.devices = devices;
    this.patterns = generateWastePatterns();
    
    devices.forEach(device => {
      this.dataWindow.set(device.id, []);
    });

    this.start();
  }

  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    
    eventBus.subscribe('energy:reading', this.handleReading.bind(this));
    
    this.intervalId = setInterval(() => {
      this.analyzeAllDevices();
    }, this.analysisInterval);

    eventBus.send('engine:status', { engine: 'load-recognizer', status: 'running' }, 'engine');
  }

  stop(): void {
    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    eventBus.unsubscribe('energy:reading', this.handleReading);
  }

  private handleReading(event: { type: string; payload: unknown }): void {
    const reading = event.payload as EnergyReading;
    if (!reading) return;

    reading.devices.forEach(deviceReading => {
      const window = this.dataWindow.get(deviceReading.deviceId) || [];
      window.push(reading);
      
      if (window.length > this.maxWindowSize) {
        window.shift();
      }
      
      this.dataWindow.set(deviceReading.deviceId, window);
    });
  }

  private analyzeAllDevices(): void {
    this.devices.forEach(device => {
      const window = this.dataWindow.get(device.id);
      if (window && window.length >= 20) {
        this.analyzeDevice(device.id, device.name, window);
      }
    });
  }

  private async analyzeDevice(
    deviceId: string,
    deviceName: string,
    readings: EnergyReading[]
  ): Promise<void> {
    const deviceReadings = readings.map(r => 
      r.devices.find(d => d.deviceId === deviceId)
    ).filter(Boolean) as DeviceReading[];

    if (deviceReadings.length < 20) return;

    const powers = deviceReadings.map(d => d.power);
    const isOnStates = deviceReadings.map(d => d.isOn ? 1 : 0);
    
    const features = this.extractFeatures(powers, isOnStates);
    const patternMatch = this.matchPatterns(normalize(powers));
    const anomalyScore = this.calculateAnomalyScore(powers, features);
    const isWaste = anomalyScore > this.anomalyThreshold || patternMatch.maxScore > 0.8;
    
    const wasteLevel = this.determineWasteLevel(anomalyScore, patternMatch.maxScore);
    
    const confidence = Math.min(
      1,
      (anomalyScore / this.anomalyThreshold) * 0.5 + patternMatch.maxScore * 0.5
    );

    const description = this.generateDescription(
      deviceName,
      features,
      patternMatch,
      anomalyScore,
      isWaste
    );

    const loadFeature: Omit<LoadFeature, 'id'> = {
      timestamp: Date.now(),
      deviceId,
      deviceName,
      waveform: powers.slice(-30),
      patternMatch: patternMatch.maxScore,
      anomalyScore,
      isWaste,
      wasteLevel,
      confidence,
      description,
      resolved: false,
    };

    if (isWaste) {
      const featureId = await dbService.addLoadFeature(loadFeature);
      
      eventBus.send('waste:detected', {
        ...loadFeature,
        id: featureId,
        matchedPattern: patternMatch.matchedPattern,
      }, 'engine', 'detection', 'high');

      eventBus.send('suggestion:generated', {
        deviceId,
        deviceName,
        type: this.getSuggestionType(patternMatch.matchedPattern),
        title: `优化 ${deviceName} 用电`,
        description: description,
        potentialSaving: this.calculateSaving(features, wasteLevel),
        savingUnit: 'kWh',
        priority: wasteLevel === 'critical' || wasteLevel === 'high' ? 'high' : 'medium',
        implemented: false,
      }, 'engine', undefined, isWaste ? 'high' : 'normal');
    }
  }

  private extractFeatures(powers: number[], isOnStates: number[]): {
    mean: number;
    stdDev: number;
    skewness: number;
    kurtosis: number;
    slope: number;
    dutyCycle: number;
    transitionCount: number;
  } {
    fft(powers);
    
    let transitionCount = 0;
    for (let i = 1; i < isOnStates.length; i++) {
      if (isOnStates[i] !== isOnStates[i - 1]) {
        transitionCount++;
      }
    }

    return {
      mean: mean(powers),
      stdDev: stdDev(powers),
      skewness: skewness(powers),
      kurtosis: kurtosis(powers),
      slope: slope(powers),
      dutyCycle: mean(isOnStates),
      transitionCount,
    };
  }

  private matchPatterns(normalizedPowers: number[]): {
    maxScore: number;
    matchedPattern: string | null;
    scores: Record<string, number>;
  } {
    const scores: Record<string, number> = {};
    let maxScore = 0;
    let matchedPattern: string | null = null;

    this.patterns.forEach(pattern => {
      const paddedSignature = this.padToLength(pattern.signature, normalizedPowers.length);
      const similarity = cosineSimilarity(normalizedPowers, paddedSignature);
      scores[pattern.id] = similarity;
      
      if (similarity > pattern.threshold && similarity > maxScore) {
        maxScore = similarity;
        matchedPattern = pattern.name;
      }
    });

    return { maxScore, matchedPattern, scores };
  }

  private padToLength(arr: number[], targetLength: number): number[] {
    if (arr.length >= targetLength) {
      return arr.slice(0, targetLength);
    }
    const result = [...arr];
    while (result.length < targetLength) {
      for (let i = 0; i < arr.length && result.length < targetLength; i++) {
        result.push(arr[i]);
      }
    }
    return result;
  }

  private calculateAnomalyScore(
    powers: number[],
    features: ReturnType<typeof this.extractFeatures>
  ): number {
    const anomalies = detectAnomalies(powers, 2);
    let score = anomalies.length * 0.5;
    
    if (features.stdDev > features.mean * 0.8) {
      score += 1.5;
    }
    
    if (features.transitionCount > 10) {
      score += 1;
    }
    
    if (features.dutyCycle > 0.9 && features.mean < features.stdDev * 2) {
      score += 1;
    }
    
    if (Math.abs(features.skewness) > 2) {
      score += 0.5;
    }
    
    if (Math.abs(features.kurtosis) > 3) {
      score += 0.5;
    }
    
    return score;
  }

  private determineWasteLevel(
    anomalyScore: number,
    patternScore: number
  ): 'low' | 'medium' | 'high' | 'critical' {
    const combinedScore = anomalyScore * 0.6 + patternScore * 4;
    
    if (combinedScore > 4) return 'critical';
    if (combinedScore > 3) return 'high';
    if (combinedScore > 2) return 'medium';
    return 'low';
  }

  private generateDescription(
    deviceName: string,
    features: ReturnType<typeof this.extractFeatures>,
    patternMatch: ReturnType<typeof this.matchPatterns>,
    anomalyScore: number,
    isWaste: boolean
  ): string {
    if (!isWaste) {
      return `${deviceName} 运行正常，负荷特征稳定`;
    }

    if (patternMatch.matchedPattern) {
      return `${deviceName} 检测到"${patternMatch.matchedPattern}"模式，异常评分 ${anomalyScore.toFixed(1)}`;
    }

    if (features.transitionCount > 10) {
      return `${deviceName} 开关过于频繁 (${features.transitionCount}次)`;
    }

    if (features.dutyCycle > 0.9) {
      return `${deviceName} 持续低负载运行，疑似空载`;
    }

    return `${deviceName} 功率波动异常，建议检查`;
  }

  private getSuggestionType(patternName: string | null): 'standby' | 'efficiency' | 'schedule' | 'replacement' {
    if (!patternName) return 'efficiency';
    
    const typeMap: Record<string, 'standby' | 'efficiency' | 'schedule' | 'replacement'> = {
      '长时间待机': 'standby',
      '夜间高待机功率异常': 'standby',
      '频繁开关循环': 'schedule',
      '空载运行': 'efficiency',
    };
    
    return typeMap[patternName] || 'efficiency';
  }

  private calculateSaving(
    features: ReturnType<typeof this.extractFeatures>,
    level: string
  ): number {
    const baseSaving = features.mean * 8 / 1000;
    const multiplier: Record<string, number> = {
      low: 0.3,
      medium: 0.6,
      high: 1.0,
      critical: 1.5,
    };
    return baseSaving * (multiplier[level] || 0.5);
  }

  getDeviceDataWindow(deviceId: string): EnergyReading[] {
    return this.dataWindow.get(deviceId) || [];
  }

  getAnalysisStatus(): {
    isRunning: boolean;
    windowSizes: Record<string, number>;
    patterns: WastePattern[];
  } {
    const windowSizes: Record<string, number> = {};
    this.dataWindow.forEach((window, deviceId) => {
      windowSizes[deviceId] = window.length;
    });
    
    return {
      isRunning: this.isRunning,
      windowSizes,
      patterns: this.patterns,
    };
  }

  clear(): void {
    this.dataWindow.clear();
  }

  destroy(): void {
    this.stop();
    this.clear();
  }
}

export const loadRecognizer = new LoadRecognizer();

export function useLoadRecognizer() {
  return loadRecognizer;
}
