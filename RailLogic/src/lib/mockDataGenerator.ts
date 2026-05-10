import type { PantographContactState, TrackGeometryParameter, TrajectoryPoint, VisualFrame } from '../types';

function generateId(): string {
  return `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomNormal(mean: number, std: number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return num * std + mean;
}

export function generatePantographState(
  trainId: string = 'TRAIN-001',
  pantographId: string = 'PANTO-01',
  baseMileage: number = 0
): PantographContactState {
  const contactForce = randomNormal(70, 15);
  const wearLevel = randomInRange(5, 25);
  const verticalDisplacement = randomNormal(0, 8);
  const horizontalDisplacement = randomNormal(0, 5);
  const temperature = randomInRange(25, 45);

  let status: PantographContactState['status'] = 'normal';
  if (contactForce > 120 || contactForce < 20 || wearLevel > 80) {
    status = 'critical';
  } else if (contactForce > 100 || contactForce < 40 || wearLevel > 60) {
    status = 'warning';
  }

  return {
    id: generateId(),
    timestamp: Date.now(),
    trainId,
    pantographId,
    contactForce,
    wearLevel,
    contactArea: randomInRange(80, 100),
    arcDetection: Math.random() < 0.02,
    vibrationFrequency: randomInRange(10, 50),
    verticalDisplacement,
    horizontalDisplacement,
    speed: randomInRange(250, 350),
    temperature,
    status
  };
}

export function generateTrackGeometryParameter(
  trackSegmentId: string = 'SEG-001',
  mileage: number = 0
): TrackGeometryParameter {
  const gauge = randomNormal(1435, 2);
  const alignment = randomNormal(0, 3);
  const profile = randomNormal(0, 2);
  const twist = randomNormal(0, 1);
  const cant = randomNormal(150, 20);

  let condition: TrackGeometryParameter['condition'] = 'good';
  const deviationScore = Math.abs(gauge - 1435) + Math.abs(alignment) + Math.abs(twist) * 2;

  if (deviationScore > 15) {
    condition = 'poor';
  } else if (deviationScore > 8) {
    condition = 'fair';
  } else if (deviationScore > 3) {
    condition = 'good';
  } else {
    condition = 'excellent';
  }

  return {
    id: generateId(),
    timestamp: Date.now(),
    trackSegmentId,
    mileage,
    gauge,
    alignment,
    profile,
    twist,
    cant,
    cantDeficiency: randomNormal(0, 10),
    acceleration: randomNormal(0, 0.5),
    speedLimit: randomInRange(200, 350),
    temperature: randomInRange(15, 35),
    condition
  };
}

export function generateTrajectoryPoint(
  mileage: number = 0,
  speed: number = 300
): TrajectoryPoint {
  return {
    id: generateId(),
    timestamp: Date.now(),
    mileage,
    x: randomNormal(0, 0.5),
    y: randomNormal(0, 0.3),
    z: randomNormal(0, 0.2),
    speed,
    acceleration: randomNormal(0, 0.1),
    source: 'fused'
  };
}

export function generateVisualFrame(
  trainId: string = 'TRAIN-001',
  cameraId: string = 'CAM-01'
): VisualFrame {
  const canvas = document.createElement('canvas');
  canvas.width = 160;
  canvas.height = 120;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, 160, 120);

  ctx.strokeStyle = '#4a4a6a';
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    const y = randomInRange(20, 100);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(160, y + randomInRange(-10, 10));
    ctx.stroke();
  }

  ctx.fillStyle = '#e94560';
  ctx.fillRect(randomInRange(50, 90), randomInRange(40, 70), 20, 15);

  const imageData = ctx.getImageData(0, 0, 160, 120);

  return {
    id: generateId(),
    timestamp: Date.now(),
    cameraId,
    trainId,
    frameData: imageData,
    displacementX: randomNormal(0, 10),
    displacementY: randomNormal(0, 5),
    confidence: randomInRange(0.7, 0.99)
  };
}

export function generateHistoricalTrackParameters(
  count: number = 100,
  startMileage: number = 0
): TrackGeometryParameter[] {
  const params: TrackGeometryParameter[] = [];
  const timeStep = 1000;
  let currentTime = Date.now() - count * timeStep;
  let currentMileage = startMileage;

  for (let i = 0; i < count; i++) {
    const param = generateTrackGeometryParameter(
      `SEG-${Math.floor(currentMileage / 1000).toString().padStart(3, '0')}`,
      currentMileage
    );
    param.timestamp = currentTime;
    params.push(param);

    currentTime += timeStep;
    currentMileage += 80;
  }

  return params;
}

export function generatePantographStatesStream(
  callback: (state: PantographContactState) => void,
  interval: number = 1000,
  trainId: string = 'TRAIN-001'
): () => void {
  let mileage = 0;

  const timerId = setInterval(() => {
    const state = generatePantographState(trainId, 'PANTO-01', mileage);
    callback(state);
    mileage += state.speed * interval / 3600;
  }, interval);

  return () => clearInterval(timerId);
}

export function generateTrackParametersStream(
  callback: (param: TrackGeometryParameter) => void,
  interval: number = 5000
): () => void {
  let mileage = 0;

  const timerId = setInterval(() => {
    const param = generateTrackGeometryParameter(
      `SEG-${Math.floor(mileage / 1000).toString().padStart(3, '0')}`,
      mileage
    );
    callback(param);
    mileage += 500;
  }, interval);

  return () => clearInterval(timerId);
}
