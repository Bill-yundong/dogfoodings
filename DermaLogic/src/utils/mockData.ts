import type { SkinScan, SkinFeatures } from '../types'
import { dbService } from '../services/database'

function generateRandomFeatures(baseOffset: number = 0): SkinFeatures {
  const base = 60 + baseOffset * 3
  
  const distribution = []
  for (let i = 0; i < 10; i++) {
    const row = []
    for (let j = 0; j < 10; j++) {
      row.push(Math.random())
    }
    distribution.push(row)
  }

  return {
    moisture: Math.max(20, Math.min(95, base + Math.random() * 20 - 10)),
    oiliness: Math.max(10, Math.min(90, 45 + Math.random() * 30 - 15)),
    elasticity: Math.max(30, Math.min(95, base + Math.random() * 15 - 7)),
    roughness: Math.max(10, Math.min(85, 40 - baseOffset * 2 + Math.random() * 20 - 10)),
    poreSize: Math.max(10, Math.min(80, 35 + Math.random() * 20 - 10)),
    wrinkles: Math.max(5, Math.min(75, 25 - baseOffset + Math.random() * 15 - 7)),
    activeIngredients: {
      hyaluronic_acid: {
        concentration: 60 + Math.random() * 30,
        penetration: 50 + Math.random() * 30,
        distribution
      },
      niacinamide: {
        concentration: 55 + Math.random() * 30,
        penetration: 45 + Math.random() * 30,
        distribution: distribution.map(r => r.map(v => v * 0.8))
      },
      vitamin_c: {
        concentration: 50 + Math.random() * 30,
        penetration: 40 + Math.random() * 30,
        distribution: distribution.map(r => r.map(v => v * 0.7))
      },
      retinol: {
        concentration: 40 + Math.random() * 30,
        penetration: 35 + Math.random() * 30,
        distribution: distribution.map(r => r.map(v => v * 0.6))
      },
      peptides: {
        concentration: 45 + Math.random() * 30,
        penetration: 38 + Math.random() * 30,
        distribution: distribution.map(r => r.map(v => v * 0.65))
      }
    }
  }
}

function calculateOverallScore(features: SkinFeatures): number {
  const weights = {
    moisture: 0.25,
    oiliness: 0.15,
    elasticity: 0.20,
    roughness: 0.15,
    poreSize: 0.15,
    wrinkles: 0.10
  }

  const normalizedOiliness = 100 - Math.abs(features.oiliness - 50) * 2

  const score =
    features.moisture * weights.moisture +
    normalizedOiliness * weights.oiliness +
    features.elasticity * weights.elasticity +
    (100 - features.roughness) * weights.roughness +
    (100 - features.poreSize) * weights.poreSize +
    (100 - features.wrinkles) * weights.wrinkles

  return Math.round(Math.max(0, Math.min(100, score)))
}

export async function addMockScan(daysAgo: number = 0): Promise<void> {
  const features = generateRandomFeatures(daysAgo)
  const score = calculateOverallScore(features)
  
  const scan: SkinScan = {
    id: `scan-mock-${Date.now()}-${daysAgo}`,
    userId: 'user-001',
    deviceId: 'device-001',
    timestamp: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
    overallScore: score,
    features,
    imageIds: []
  }

  await dbService.saveSkinScan(scan)
}

export async function generateMockDevices(): Promise<void> {
  const devices = [
    {
      id: 'device-001',
      name: 'DermaScan Pro',
      type: 'scanner' as const,
      status: 'connected' as const,
      lastSync: new Date(),
      battery: 85
    },
    {
      id: 'device-002',
      name: 'SkinAnalyzer Mini',
      type: 'analyzer' as const,
      status: 'disconnected' as const,
      lastSync: new Date(Date.now() - 86400000),
      battery: 62
    }
  ]

  for (const device of devices) {
    await dbService.saveDevice(device)
  }
}
