import type {
  PowerSpectrumPoint,
  PartFingerprint,
  MeasuredRoughness,
  PowerSpectrumSummary,
} from '@/types';
import { extractPowerSpectrumFeatures } from './fractal';
import { predictRoughness } from './prediction';

export function generatePowerSpectrumData(
  duration: number = 10,
  sampleRate: number = 1000,
  baseFrequency: number = 50
): PowerSpectrumPoint[] {
  const points: PowerSpectrumPoint[] = [];
  const startTime = Date.now() - duration * 1000;

  for (let i = 0; i < duration * sampleRate; i++) {
    const timestamp = startTime + (i * 1000) / sampleRate;
    const frequency = (i / (duration * sampleRate)) * 2000;

    const baseAmplitude = 10 * Math.exp(-frequency / 500);
    const harmonicPeaks = [1, 2, 3, 4, 5]
      .map((h) => 8 * Math.exp(-Math.abs(frequency - baseFrequency * h) / 50))
      .reduce((a, b) => a + b, 0);
    const noise = (Math.random() - 0.5) * 2;
    const chatter = frequency > 300 && frequency < 500 ? 3 * Math.sin(frequency * 0.1) : 0;

    const amplitude = Math.max(0, baseAmplitude + harmonicPeaks + noise + chatter);

    points.push({
      timestamp,
      frequency,
      amplitude,
      channel: 'CH1',
    });
  }

  return points;
}

export function generateRealtimePowerSpectrumPoint(
  timestamp: number,
  index: number
): PowerSpectrumPoint {
  const frequency = (index % 1000) * 2;
  const baseAmplitude = 10 * Math.exp(-frequency / 500);
  const harmonicPeaks = [1, 2, 3, 4, 5]
    .map((h) => 8 * Math.exp(-Math.abs(frequency - 50 * h) / 50))
    .reduce((a, b) => a + b, 0);
  const noise = (Math.random() - 0.5) * 2;
  const amplitude = Math.max(0, baseAmplitude + harmonicPeaks + noise);

  return {
    timestamp,
    frequency,
    amplitude,
    channel: 'CH1',
  };
}

export function calculatePowerSpectrumSummary(
  points: PowerSpectrumPoint[]
): PowerSpectrumSummary {
  const amplitudes = points.map((p) => p.amplitude);
  const frequencies = points.map((p) => p.frequency);

  const minFrequency = Math.min(...frequencies);
  const maxFrequency = Math.max(...frequencies);
  const peakIndex = amplitudes.indexOf(Math.max(...amplitudes));
  const dominantFrequency = frequencies[peakIndex];
  const averageAmplitude = amplitudes.reduce((a, b) => a + b, 0) / amplitudes.length;
  const peakAmplitude = Math.max(...amplitudes);
  const rmsAmplitude = Math.sqrt(amplitudes.reduce((a, b) => a + b * b, 0) / amplitudes.length);
  const totalEnergy = amplitudes.reduce((a, b) => a + b * b, 0);

  return {
    minFrequency,
    maxFrequency,
    dominantFrequency,
    averageAmplitude,
    peakAmplitude,
    rmsAmplitude,
    totalEnergy,
  };
}

export function generateMockFingerprints(count: number = 20): PartFingerprint[] {
  const fingerprints: PartFingerprint[] = [];
  const now = Date.now();
  const partTypes = ['Bearing-Race', 'Gear-Tooth', 'Shaft-Journal', 'Piston-Ring', 'Valve-Seat'];
  const batches = ['BATCH-2024-05-001', 'BATCH-2024-05-002', 'BATCH-2024-05-003'];

  for (let i = 0; i < count; i++) {
    const partType = partTypes[Math.floor(Math.random() * partTypes.length)];
    const partNumber = `${partType}-${String(1000 + i).padStart(4, '0')}`;
    const batchId = batches[Math.floor(Math.random() * batches.length)];
    const startTime = now - i * 3600000 * 2;
    const endTime = startTime + 1800000 + Math.random() * 1800000;

    const powerSpectrumData = generatePowerSpectrumData(5, 200, 50 + Math.random() * 20);
    const powerSpectrumSummary = calculatePowerSpectrumSummary(powerSpectrumData);
    const { fractal, statistical } = extractPowerSpectrumFeatures(powerSpectrumData);

    const processingParams = {
      feedRate: 150 + Math.random() * 200,
      spindleSpeed: 3000 + Math.random() * 5000,
      depthOfCut: 10 + Math.random() * 30,
      grindingWheelSpeed: 20 + Math.random() * 30,
      coolantPressure: 4 + Math.random() * 3,
    };

    const prediction = predictRoughness(fractal, statistical, processingParams);

    const hasMeasurement = Math.random() > 0.3;
    let measuredRoughness: MeasuredRoughness | undefined;
    let qualityStatus: 'PASS' | 'FAIL' | 'PENDING' = 'PENDING';

    if (hasMeasurement) {
      const actualRa = prediction.predictedRa * (0.85 + Math.random() * 0.3);
      const actualRz = actualRa * 5 + (Math.random() - 0.5) * 0.5;
      const actualRq = actualRa * 1.2 + (Math.random() - 0.5) * 0.1;

      measuredRoughness = {
        ra: actualRa,
        rz: actualRz,
        rq: actualRq,
        measuredAt: endTime + 300000,
        inspector: ['张三', '李四', '王五'][Math.floor(Math.random() * 3)],
        measurementMethod: '接触式轮廓仪',
      };

      qualityStatus = actualRa <= 1.6 ? 'PASS' : 'FAIL';
    }

    fingerprints.push({
      id: crypto.randomUUID(),
      partNumber,
      batchId,
      startTime,
      endTime,
      processingParams,
      powerSpectrumSummary,
      predictedRoughness: prediction,
      measuredRoughness,
      qualityStatus,
      createdAt: endTime,
      tags: [partType, batchId, qualityStatus],
    });
  }

  return fingerprints.sort((a, b) => b.createdAt - a.createdAt);
}

export function generatePredictionHistory(count: number = 10) {
  const history = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const predictedRa = 0.2 + Math.random() * 1.5;
    const actualRa = predictedRa * (0.85 + Math.random() * 0.3);
    const accuracy = Math.max(0, 100 - Math.abs(predictedRa - actualRa) / predictedRa * 100);

    history.push({
      id: crypto.randomUUID(),
      timestamp: now - i * 600000,
      partNumber: `PART-${String(1000 + i).padStart(4, '0')}`,
      predictedRa,
      actualRa: Math.random() > 0.2 ? actualRa : undefined,
      accuracy: Math.random() > 0.2 ? accuracy : undefined,
      status: Math.random() > 0.1 ? ('SUCCESS' as const) : ('PENDING' as const),
    });
  }

  return history;
}

export function generateProcessingParams() {
  return {
    feedRate: 150 + Math.random() * 200,
    spindleSpeed: 3000 + Math.random() * 5000,
    depthOfCut: 10 + Math.random() * 30,
    grindingWheelSpeed: 20 + Math.random() * 30,
    coolantPressure: 4 + Math.random() * 3,
  };
}
