import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { v4 as uuidv4 } from 'uuid';
import type { FlavorProfile, ExtractionDataPoint, BrewingPreset } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  return uuidv4();
}

export function getCurrentTimestamp(): number {
  return Date.now();
}

export function calculateHash(obj: Record<string, any>): string {
  const str = JSON.stringify(obj);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

export function calculateFlavorDistance(
  profile1: FlavorProfile,
  profile2: FlavorProfile
): number {
  const keys = Object.keys(profile1) as (keyof FlavorProfile)[];
  const squaredDiffs = keys.map(key => {
    const diff = profile1[key] - profile2[key];
    return diff * diff;
  });
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0));
}

export function isWithinTolerance(
  actual: FlavorProfile,
  target: FlavorProfile,
  tolerance: FlavorProfile
): boolean {
  const keys = Object.keys(actual) as (keyof FlavorProfile)[];
  return keys.every(key => {
    const diff = Math.abs(actual[key] - target[key]);
    return diff <= tolerance[key];
  });
}

export function calculateQualityScore(
  actual: FlavorProfile,
  target: FlavorProfile,
  tds: number,
  targetTDS: number,
  extractionYield: number,
  targetYield: number
): number {
  const flavorDistance = calculateFlavorDistance(actual, target);
  const flavorScore = Math.max(0, 100 - flavorDistance * 5);
  
  const tdsDiff = Math.abs(tds - targetTDS);
  const tdsScore = Math.max(0, 100 - tdsDiff * 20);
  
  const yieldDiff = Math.abs(extractionYield - targetYield);
  const yieldScore = Math.max(0, 100 - yieldDiff * 10);
  
  return (flavorScore * 0.5 + tdsScore * 0.25 + yieldScore * 0.25);
}

export function calculateExtractionYield(
  tds: number,
  beverageWeight: number,
  dose: number
): number {
  return (tds * beverageWeight) / dose / 10;
}

export function calculateAverageCurve(
  curves: ExtractionDataPoint[][]
): ExtractionDataPoint[] {
  if (curves.length === 0) return [];
  
  const maxPoints = Math.max(...curves.map(c => c.length));
  const result: ExtractionDataPoint[] = [];
  
  for (let i = 0; i < maxPoints; i++) {
    const validPoints = curves
      .map(c => c[i])
      .filter(Boolean);
    
    if (validPoints.length === 0) continue;
    
    const avg: ExtractionDataPoint = {
      time: validPoints.reduce((sum, p) => sum + p.time, 0) / validPoints.length,
      temperature: validPoints.reduce((sum, p) => sum + p.temperature, 0) / validPoints.length,
      pressure: validPoints.reduce((sum, p) => sum + p.pressure, 0) / validPoints.length,
      flowRate: validPoints.reduce((sum, p) => sum + p.flowRate, 0) / validPoints.length,
      tds: validPoints.reduce((sum, p) => sum + p.tds, 0) / validPoints.length,
      weight: validPoints.reduce((sum, p) => sum + p.weight, 0) / validPoints.length,
    };
    
    result.push(avg);
  }
  
  return result;
}

export function calculateCurveDeviation(
  reference: ExtractionDataPoint[],
  actual: ExtractionDataPoint[]
): number {
  if (reference.length === 0 || actual.length === 0) return Infinity;
  
  let totalDeviation = 0;
  const minLength = Math.min(reference.length, actual.length);
  
  for (let i = 0; i < minLength; i++) {
    const ref = reference[i];
    const act = actual[i];
    
    totalDeviation += Math.abs(ref.temperature - act.temperature) * 0.3;
    totalDeviation += Math.abs(ref.pressure - act.pressure) * 0.3;
    totalDeviation += Math.abs(ref.flowRate - act.flowRate) * 0.2;
    totalDeviation += Math.abs(ref.weight - act.weight) * 0.2;
  }
  
  return totalDeviation / minLength;
}

export function optimizeForAltitude(
  preset: BrewingPreset,
  altitude: number
): Partial<BrewingPreset> {
  const altitudeFactor = altitude / 1000;
  const tempAdjustment = Math.min(altitudeFactor * 0.5, 2);
  const pressureAdjustment = Math.min(altitudeFactor * 0.3, 1);
  const grindAdjustment = Math.min(altitudeFactor * 30, 100);
  
  return {
    waterTemperature: preset.waterTemperature + tempAdjustment,
    grindSize: preset.grindSize - grindAdjustment,
    pressureProfile: preset.pressureProfile?.map(p => ({
      ...p,
      pressure: p.pressure + pressureAdjustment,
    })),
  };
}

export function optimizeForWater(
  preset: BrewingPreset,
  hardness: number,
  alkalinity: number
): Partial<BrewingPreset> {
  const hardnessFactor = (hardness - 100) / 100;
  const alkalinityFactor = (alkalinity - 80) / 80;
  
  const tempAdjustment = hardnessFactor * 1;
  const timeAdjustment = alkalinityFactor * 5;
  const grindAdjustment = hardnessFactor * 20;
  
  return {
    waterTemperature: preset.waterTemperature + tempAdjustment,
    brewTime: preset.brewTime + timeAdjustment,
    grindSize: preset.grindSize + grindAdjustment,
  };
}

export function formatNumber(value: number, decimals: number = 2): string {
  return value.toFixed(decimals);
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}
