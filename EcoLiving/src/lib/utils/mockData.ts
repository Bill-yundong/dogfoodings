import type { Device, EnergyReading, EnergySnapshot, LoadFeature, DeviceSnapshot } from '@/lib/types/energy';
import { generateId } from '@/lib/utils/formatters';
import { clamp } from '@/lib/utils/formatters';
import { dbService } from '@/lib/db/indexedDB';
export const defaultDevices: Omit<Device, 'id'>[] = [
  {
    name: '客厅空调',
    category: 'climate',
    icon: 'air-conditioning',
    ratedPower: 1500,
    standbyPower: 8,
    isSmart: true,
    isOn: true,
    location: '客厅',
  },
  {
    name: '主卧室空调',
    category: 'climate',
    icon: 'air-conditioning',
    ratedPower: 1200,
    standbyPower: 6,
    isSmart: true,
    isOn: false,
    location: '主卧室',
  },
  {
    name: '4K 智能电视',
    category: 'entertainment',
    icon: 'tv',
    ratedPower: 150,
    standbyPower: 12,
    isSmart: true,
    isOn: true,
    location: '客厅',
  },
  {
    name: '冰箱',
    category: 'kitchen',
    icon: 'fridge',
    ratedPower: 200,
    standbyPower: 2,
    isSmart: false,
    isOn: true,
    location: '厨房',
  },
  {
    name: '滚筒洗衣机',
    category: 'laundry',
    icon: 'washing-machine',
    ratedPower: 500,
    standbyPower: 3,
    isSmart: true,
    isOn: false,
    location: '阳台',
  },
  {
    name: '电热水器',
    category: 'water-heater',
    icon: 'heater',
    ratedPower: 2000,
    standbyPower: 5,
    isSmart: true,
    isOn: true,
    location: '卫生间',
  },
  {
    name: '客厅灯光组灯',
    category: 'lighting',
    icon: 'lightbulb',
    ratedPower: 80,
    standbyPower: 0.5,
    isSmart: true,
    isOn: true,
    location: '客厅',
  },
  {
    name: '厨房灯光组灯',
    category: 'lighting',
    icon: 'lightbulb',
    ratedPower: 60,
    standbyPower: 0.5,
    isSmart: true,
    isOn: false,
    location: '厨房',
  },
  {
    name: '路由器',
    category: 'network',
    icon: 'router',
    ratedPower: 15,
    standbyPower: 0,
    isSmart: false,
    isOn: true,
    location: '客厅',
  },
  {
    name: '台式电脑',
    category: 'computer',
    icon: 'monitor',
    ratedPower: 350,
    standbyPower: 15,
    isSmart: true,
    isOn: false,
    location: '书房',
  },
];

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export function generateDeviceReading(
  device: Device,
  timestamp: number,
  hourOfDay: number
): { power: number; isOn: boolean; isStandby: boolean } {
  let isOn = device.isOn;
  let power = 0;
  let isStandby = false;

  const hourFactor = Math.sin((hourOfDay / 24 * Math.PI * 2 - Math.PI / 2)) * 0.5 + 0.5;
  const randomFactor = seededRandom(timestamp / 1000 + device.ratedPower);

  if (!device.isOn) {
    isOn = false;
    power = device.standbyPower * (0.8 + randomFactor * 0.4);
    isStandby = device.standbyPower > 0;
  } else {
    const usageFactor = 0.3 + hourFactor * 0.7;
    const variance = 0.8 + randomFactor * 0.4;
    power = device.ratedPower * usageFactor * variance;
    isStandby = false;

    if (power < device.standbyPower * 1.5 && device.standbyPower > 0) {
      isStandby = true;
    }
  }

  return {
    power: clamp(power, 0, device.ratedPower * 1.2),
    isOn,
    isStandby,
  };
}

export function generateEnergyReading(
  devices: Device[],
  timestamp?: number
): EnergyReading {
  const ts = timestamp || Date.now();
  const date = new Date(ts);
  const hourOfDay = date.getHours() + date.getMinutes() / 60;

  const deviceReadings = devices.map(device => {
    const reading = generateDeviceReading(device, ts, hourOfDay);
    return {
      deviceId: device.id,
      name: device.name,
      power: reading.power,
      isOn: reading.isOn,
      isStandby: reading.isStandby,
      standbyDuration: reading.isStandby ? 3600 + Math.random() * 7200 : 0,
    };
  });

  const totalPower = deviceReadings.reduce((sum, d) => sum + d.power, 0);
  const standbyPower = deviceReadings
    .filter(d => d.isStandby)
    .reduce((sum, d) => sum + d.power, 0);

  return {
    timestamp: ts,
    totalPower,
    standbyPower,
    devices: deviceReadings,
  };
}

export function generateHistoricalSnapshots(days: number = 30): EnergySnapshot[] {
  const snapshots: EnergySnapshot[] = [];
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  for (let day = days; day >= 0; day--) {
    for (let hour = 0; hour < 24; hour += 3) {
      const timestamp = now - day * dayMs - hour * 3600 * 1000;
      const date = new Date(timestamp);
      const dateStr = date.toISOString().split('T')[0];

      const weather = {
        temperature: 15 + Math.sin(day / 7) * 10 + Math.random() * 5,
        humidity: 40 + Math.random() * 40,
      };

      const deviceBreakdown: DeviceSnapshot[] = defaultDevices.map((d, idx) => {
        const baseConsumption = (d.ratedPower / 1000) * (2 + Math.random() * 4);
        const runHours = 1 + Math.random() * 6;
        const standbyHours = 24 - runHours;

        return {
          deviceId: `hist-${idx}`,
          name: d.name,
          consumption: baseConsumption * runHours,
          runHours,
          standbyHours,
          category: d.category,
        };
      });

      const totalConsumption = deviceBreakdown.reduce((sum, d) => sum + d.consumption, 0);
      const standbyConsumption = totalConsumption * (0.15 + Math.random() * 0.2);
      const efficiencyScore = 60 + Math.random() * 35;
      const cost = totalConsumption * 0.56;

      const wastePoints: string[] = [];
      if (Math.random() > 0.6) {
        wastePoints.push(generateId());
      }

      snapshots.push({
        id: generateId(),
        timestamp,
        date: dateStr,
        hour,
        totalConsumption,
        standbyConsumption,
        cost,
        efficiencyScore,
        deviceBreakdown,
        detectedWastePoints: wastePoints,
        weather,
      });
    }
  }

  return snapshots.sort((a, b) => a.timestamp - b.timestamp);
}

export function generateWastePatterns() {
  return [
    {
      id: 'pattern-001',
      name: '长时间待机',
      description: '设备长时间处于待机状态超过4小时以上',
      signature: [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1],
      threshold: 0.85,
    },
    {
      id: 'pattern-002',
      name: '夜间高待机功率异常',
      description: '设备待机功率超出额定值2倍以上',
      signature: [0.5, 0.6, 0.7, 0.8, 0.9, 0.8, 0.7, 0.6],
      threshold: 0.75,
    },
    {
      id: 'pattern-003',
      name: '频繁开关循环',
      description: '设备在短时间内频繁开关',
      signature: [0, 1, 0, 1, 0, 1, 0, 1],
      threshold: 0.8,
    },
    {
      id: 'pattern-004',
      name: '空载运行',
      description: '设备运行但无实际负载',
      signature: [0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3],
      threshold: 0.7,
    },
  ];
}

export async function initializeMockData(): Promise<void> {
  const existingDevices = await dbService.getDevices();
  
  if (existingDevices.length === 0) {
    for (const device of defaultDevices) {
      await dbService.addDevice(device);
    }
  }

  const existingSnapshots = await dbService.getSnapshots(1);
  if (existingSnapshots.length === 0) {
    const snapshots = generateHistoricalSnapshots(30);
    for (const snapshot of snapshots) {
      await dbService.addSnapshot(snapshot);
    }
  }

  const existingFeatures = await dbService.getLoadFeatures({ limit: 1 });
  if (existingFeatures.length === 0) {
    const devices = await dbService.getDevices();
    const now = Date.now();
    
    for (let i = 0; i < 20; i++) {
      const device = devices[Math.floor(Math.random() * devices.length)];
      const isWaste = Math.random() > 0.4;
      const levels: Array<'low' | 'medium' | 'high' | 'critical'> = ['low', 'medium', 'high', 'critical'];
      const descriptions = [
        '设备长时间处于待机状态',
        '待机功率异常偏高',
        '设备空载运行',
        '非工作时段仍在运行',
        '功率波动异常',
      ];
      
      const feature: Omit<LoadFeature, 'id'> = {
        timestamp: now - i * 3600 * 1000 * Math.random() * 3,
        deviceId: device.id,
        deviceName: device.name,
        waveform: Array.from({ length: 30 }, () => Math.random() * device.ratedPower * (0.1 + Math.random() * 0.5)),
        patternMatch: 0.6 + Math.random() * 0.4,
        anomalyScore: isWaste ? 2 + Math.random() * 6 : 0.5 + Math.random() * 1.5,
        isWaste,
        wasteLevel: levels[Math.floor(Math.random() * levels.length)],
        confidence: 0.7 + Math.random() * 0.3,
        description: descriptions[Math.floor(Math.random() * descriptions.length)],
        resolved: Math.random() > 0.7,
      };
      
      if (isWaste) {
        await dbService.addLoadFeature(feature);
      }
    }
  }

  await dbService.setMetadata('initialized', true);
  await dbService.setMetadata('initTime', Date.now());
}

export function generateWaveform(length: number, basePower: number, hasAnomaly: boolean = false): number[] {
  const waveform: number[] = [];
  let current = basePower * 0.3;

  for (let i = 0; i < length; i++) {
    const noise = (Math.random() - 0.5) * basePower * 0.1;
    current += noise;
    
    if (hasAnomaly && i > length * 0.4 && i < length * 0.6) {
      current += basePower * (0.5 + Math.random() * 0.5);
    }
    
    waveform.push(Math.max(0, current));
  }
  
  return waveform;
}
