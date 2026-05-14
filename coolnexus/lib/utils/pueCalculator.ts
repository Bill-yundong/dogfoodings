import { PowerSnapshot, PUEStats } from '../types/datacenter';

export function calculatePUE(itPower: number, coolingPower: number, otherPower: number = 0): number {
  const totalPower = itPower + coolingPower + otherPower;
  if (itPower === 0) return 1.0;
  return totalPower / itPower;
}

export function calculatePUEStats(snapshots: PowerSnapshot[]): PUEStats {
  if (snapshots.length === 0) {
    return {
      currentPUE: 1.0,
      targetPUE: 1.4,
      dailyAverage: 1.0,
      weeklyAverage: 1.0,
      monthlyAverage: 1.0,
      trend: 'stable'
    };
  }

  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  const oneWeek = 7 * oneDay;
  const oneMonth = 30 * oneDay;

  const dailySnapshots = snapshots.filter(s => now - s.timestamp < oneDay);
  const weeklySnapshots = snapshots.filter(s => now - s.timestamp < oneWeek);
  const monthlySnapshots = snapshots.filter(s => now - s.timestamp < oneMonth);

  const currentPUE = snapshots[snapshots.length - 1].pue;
  const dailyAverage = dailySnapshots.length > 0 
    ? dailySnapshots.reduce((sum, s) => sum + s.pue, 0) / dailySnapshots.length 
    : currentPUE;
  const weeklyAverage = weeklySnapshots.length > 0 
    ? weeklySnapshots.reduce((sum, s) => sum + s.pue, 0) / weeklySnapshots.length 
    : dailyAverage;
  const monthlyAverage = monthlySnapshots.length > 0 
    ? monthlySnapshots.reduce((sum, s) => sum + s.pue, 0) / monthlySnapshots.length 
    : weeklyAverage;

  let trend: PUEStats['trend'] = 'stable';
  if (snapshots.length >= 2) {
    const recentAvg = snapshots.slice(-5).reduce((sum, s) => sum + s.pue, 0) / 5;
    const earlierAvg = snapshots.slice(-10, -5).reduce((sum, s) => sum + s.pue, 0) / 5;
    if (recentAvg < earlierAvg - 0.02) {
      trend = 'improving';
    } else if (recentAvg > earlierAvg + 0.02) {
      trend = 'worsening';
    }
  }

  return {
    currentPUE,
    targetPUE: 1.4,
    dailyAverage,
    weeklyAverage,
    monthlyAverage,
    trend
  };
}

export function getPUEColor(pue: number): string {
  if (pue < 1.3) return 'text-green-400';
  if (pue < 1.5) return 'text-yellow-400';
  if (pue < 1.8) return 'text-orange-400';
  return 'text-red-400';
}

export function getPUEBackgroundColor(pue: number): string {
  if (pue < 1.3) return 'bg-green-500/20';
  if (pue < 1.5) return 'bg-yellow-500/20';
  if (pue < 1.8) return 'bg-orange-500/20';
  return 'bg-red-500/20';
}
