import type {
  WineLabel,
  CellarZone,
  WineBottle,
  SensorReading,
  SemanticMapping,
  MaturationModel,
  DrinkingWindow,
  Alert,
} from '@/types';

const CHATEAUS = [
  'Château Margaux', 'Château Lafite Rothschild', 'Château Latour',
  'Château Haut-Brion', 'Château Mouton Rothschild', 'Château Cheval Blanc',
  'Château Ausone', 'Château Pétrus', 'Château Le Pin', 'Château d\'Yquem',
  'Domaine de la Romanée-Conti', 'Domaine Armand Rousseau', 'Domaine Georges Roumier',
  'Domaine Comte Georges de Vogüé', 'Domaine Leflaive', 'Domaine Coche-Dury',
  'Domaine Meo-Camuzet', 'Domaine Ponsot', 'Domaine de la Romanée-Conti',
  'Château Palmer', 'Château Angélus', 'Château Cheval Blanc', 'Château Figeac',
  'Château Canon', 'Château Troplong Mondot', 'Château Pavie', 'Château Ausone',
  'Château Cheval Blanc', 'Château La Mission Haut-Brion', 'Château Pichon Longueville Baron',
  'Château Pichon Longueville Comtesse de Lalande', 'Château Léoville Las Cases',
  'Château Ducru-Beaucaillou', 'Château Gruaud Larose', 'Château Talbot',
  'Château Beychevelle', 'Château Branaire-Ducru', 'Château Saint-Pierre',
  'Opus One', 'Screaming Eagle', 'Harlan Estate', 'Caymus Vineyards',
  'Penfolds Grange', 'Henschke Hill of Grace', 'Cloudy Bay', 'Vega Sicilia',
  'Pingus', 'Ornellaia', 'Sassicaia', 'Tignanello', 'Solaia', 'Gaja',
];

const REGIONS = [
  'Bordeaux', 'Burgundy', 'Napa Valley', 'Tuscany', 'Piedmont',
  'Rhône Valley', 'Rioja', 'Douro', 'Mendoza', 'Barossa Valley',
  'Margaret River', 'Central Otago', 'Willamette Valley', 'Sonoma Valley',
  'Chianti Classico', 'Brunello di Montalcino', 'Amarone della Valpolicella',
  'Hermitage', 'Côte-Rôtie', 'Châteauneuf-du-Pape',
];

const COUNTRIES = [
  'France', 'Italy', 'United States', 'Spain', 'Portugal',
  'Australia', 'New Zealand', 'Argentina', 'Chile', 'Germany',
];

const GRAPE_VARIETIES = [
  'Cabernet Sauvignon', 'Merlot', 'Pinot Noir', 'Cabernet Franc',
  'Malbec', 'Syrah', 'Sangiovese', 'Nebbiolo', 'Tempranillo',
  'Chardonnay', 'Sauvignon Blanc', 'Riesling', 'Viognier',
];

const CLASSIFICATIONS = [
  'Premier Grand Cru Classé A', 'Grand Cru Classé', 'Premier Cru Classé',
  'Grand Cru', 'Premier Cru', 'Grand Vin', 'Reserve', 'Special Reserve',
];

const TASTING_NOTES = [
  '黑醋栗', '雪松', '烟草', '皮革', '覆盆子', '樱桃', '紫罗兰',
  '松露', '蘑菇', '土壤', '矿物', '石墨', '蜂蜜', '焦糖',
  '香草', '烟熏', '胡椒', '香料', '柑橘', '白桃', '苹果',
  '梨', '杏', '无花果', '枣', '咖啡', '巧克力', '摩卡',
];

const generateId = (): string => Math.random().toString(36).substring(2, 15);

export const generateWineLabels = (count: number): WineLabel[] => {
  const labels: WineLabel[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const vintage = 1982 + Math.floor(Math.random() * 43);
    const peakStart = vintage + 10 + Math.floor(Math.random() * 15);
    const peakEnd = peakStart + 10 + Math.floor(Math.random() * 15);

    labels.push({
      id: generateId(),
      chateau: CHATEAUS[i % CHATEAUS.length],
      vintage,
      region: REGIONS[i % REGIONS.length],
      appellation: `${REGIONS[i % REGIONS.length]} AOC`,
      grapeVarieties: [
        GRAPE_VARIETIES[i % GRAPE_VARIETIES.length],
        GRAPE_VARIETIES[(i + 3) % GRAPE_VARIETIES.length],
      ].slice(0, 1 + Math.floor(Math.random() * 3)),
      classification: CLASSIFICATIONS[i % CLASSIFICATIONS.length],
      alcoholContent: 12.5 + Math.random() * 4,
      bottleSize: [750, 1500, 3000][Math.floor(Math.random() * 3)],
      producer: CHATEAUS[i % CHATEAUS.length],
      country: COUNTRIES[i % COUNTRIES.length],
      imageUrl: `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(`wine bottle label ${CHATEAUS[i % CHATEAUS.length]} ${vintage} elegant classic`)}&image_size=square`,
      tastingNotes: TASTING_NOTES.sort(() => Math.random() - 0.5).slice(0, 5),
      agingPotential: {
        minYears: 5 + Math.floor(Math.random() * 10),
        maxYears: 20 + Math.floor(Math.random() * 30),
        peakStart,
        peakEnd,
        confidence: 0.7 + Math.random() * 0.3,
      },
      createdAt: now - Math.floor(Math.random() * 86400000 * 365),
      updatedAt: now,
    });
  }

  return labels;
};

export const generateCellarZones = (): CellarZone[] => [
  {
    id: 'zone-1',
    name: '珍藏红葡萄酒区',
    description: '适合长期陈年的波尔多和勃艮第红葡萄酒',
    targetTemperature: { min: 12, max: 14, optimal: 13 },
    targetHumidity: { min: 65, max: 75, optimal: 70 },
    sensorIds: ['sensor-1', 'sensor-2'],
    wineBottleIds: [],
  },
  {
    id: 'zone-2',
    name: '陈年潜力区',
    description: '具有高陈年潜力的顶级佳酿',
    targetTemperature: { min: 10, max: 12, optimal: 11 },
    targetHumidity: { min: 70, max: 80, optimal: 75 },
    sensorIds: ['sensor-3', 'sensor-4'],
    wineBottleIds: [],
  },
  {
    id: 'zone-3',
    name: '白葡萄酒与甜酒区',
    description: '白葡萄酒、贵腐甜酒和香槟储存区',
    targetTemperature: { min: 8, max: 10, optimal: 9 },
    targetHumidity: { min: 60, max: 70, optimal: 65 },
    sensorIds: ['sensor-5'],
    wineBottleIds: [],
  },
  {
    id: 'zone-4',
    name: '即饮区',
    description: '已进入适饮期的葡萄酒',
    targetTemperature: { min: 14, max: 16, optimal: 15 },
    targetHumidity: { min: 60, max: 70, optimal: 65 },
    sensorIds: ['sensor-6'],
    wineBottleIds: [],
  },
];

export const generateWineBottles = (labels: WineLabel[], zones: CellarZone[]): WineBottle[] => {
  const bottles: WineBottle[] = [];
  const now = Date.now();

  labels.forEach((label, index) => {
    const zone = zones[index % zones.length];
    const quantity = 1 + Math.floor(Math.random() * 12);
    const purchaseDate = now - Math.floor(Math.random() * 86400000 * 365 * 5);

    const bottle: WineBottle = {
      id: generateId(),
      labelId: label.id,
      purchaseDate,
      purchasePrice: 500 + Math.random() * 9500,
      location: {
        zoneId: zone.id,
        position: `A${1 + Math.floor(Math.random() * 10)}-${1 + Math.floor(Math.random() * 20)}`,
      },
      quantity,
      condition: ['excellent', 'good', 'fair'][Math.floor(Math.random() * 3)] as 'excellent' | 'good' | 'fair',
      storageStartDate: purchaseDate + 86400000,
      lastInspectionDate: now - Math.floor(Math.random() * 86400000 * 30),
      notes: Math.random() > 0.5 ? '品相完美，酒标完好' : undefined,
    };

    bottles.push(bottle);
    zone.wineBottleIds.push(bottle.id);
  });

  return bottles;
};

export const generateSensorReadings = (zones: CellarZone[], days: number = 30): SensorReading[] => {
  const readings: SensorReading[] = [];
  const now = Date.now();
  const interval = 3600000;

  zones.forEach(zone => {
    zone.sensorIds.forEach(() => {
      for (let i = days * 24; i >= 0; i--) {
        const timestamp = now - i * interval;
        const tempVariation = (Math.random() - 0.5) * 2;
        const humidityVariation = (Math.random() - 0.5) * 10;

        readings.push({
          id: generateId(),
          timestamp,
          zoneId: zone.id,
          temperature: zone.targetTemperature.optimal + tempVariation,
          humidity: Math.max(40, Math.min(90, zone.targetHumidity.optimal + humidityVariation)),
          lightIntensity: Math.random() * 50,
          vibration: Math.random() * 0.5,
        });
      }
    });
  });

  return readings;
};

export const semanticMappings: SemanticMapping[] = [
  {
    sensorMetric: 'temperature',
    wineProperty: 'maturationRate',
    correlation: 0.85,
    impactFactor: 1.8,
    description: '温度每升高1°C，熟化速度加快约8-12%',
    units: '°C',
  },
  {
    sensorMetric: 'humidity',
    wineProperty: 'corkIntegrity',
    correlation: 0.78,
    impactFactor: 1.5,
    description: '湿度低于60%会加速软木塞干燥，导致氧化风险增加',
    units: '% RH',
  },
  {
    sensorMetric: 'temperatureVariation',
    wineProperty: 'stability',
    correlation: -0.92,
    impactFactor: 2.0,
    description: '温度波动超过±2°C/24h会严重影响酒液稳定性',
    units: 'Δ°C/24h',
  },
  {
    sensorMetric: 'lightIntensity',
    wineProperty: 'lightStrike',
    correlation: -0.75,
    impactFactor: 1.3,
    description: '紫外线照射会导致葡萄酒发生光损伤，产生不愉快气味',
    units: 'lux',
  },
  {
    sensorMetric: 'vibration',
    wineProperty: 'sedimentStability',
    correlation: -0.68,
    impactFactor: 1.1,
    description: '持续振动会扰乱沉淀物，影响陈年过程中的风味发展',
    units: 'g',
  },
  {
    sensorMetric: 'storageDuration',
    wineProperty: 'complexity',
    correlation: 0.72,
    impactFactor: 1.4,
    description: '在理想条件下，适当的陈年时间会增加葡萄酒的复杂度',
    units: 'years',
  },
];

export const generateMaturationModel = (label: WineLabel, bottle: WineBottle): MaturationModel => {
  const now = Date.now();
  const currentAge = (now - label.vintage * 31536000000) / 31536000000;
  const peakMid = (label.agingPotential.peakStart + label.agingPotential.peakEnd) / 2;

  const calculateMaturityScore = (age: number): number => {
    const peakCenter = peakMid;
    const peakWidth = (label.agingPotential.peakEnd - label.agingPotential.peakStart) / 2;
    const distanceFromPeak = Math.abs(age - peakCenter);
    if (distanceFromPeak <= peakWidth) {
      return 90 + Math.random() * 10;
    } else {
      const decline = (distanceFromPeak - peakWidth) * 2;
      return Math.max(50, 95 - decline);
    }
  };

  const maturityScore = calculateMaturityScore(currentAge);
  const predictedDevelopment: MaturationModel['predictedDevelopment'] = [];

  for (let i = 0; i < 10; i++) {
    const futureDate = now + i * 31536000000;
    const futureAge = currentAge + i;
    predictedDevelopment.push({
      date: futureDate,
      predictedScore: calculateMaturityScore(futureAge),
      confidence: Math.max(0.5, 0.95 - i * 0.05),
      scenario: 'optimal',
    });
  }

  return {
    wineId: bottle.id,
    currentAge,
    maturityScore,
    tanninLevel: Math.max(20, 80 - currentAge * 2 + (Math.random() - 0.5) * 10),
    acidityLevel: Math.max(30, 70 - currentAge * 1.5 + (Math.random() - 0.5) * 8),
    fruitLevel: Math.max(20, 90 - currentAge * 1.2 + (Math.random() - 0.5) * 10),
    complexityLevel: Math.min(95, 40 + currentAge * 1.5 + (Math.random() - 0.5) * 10),
    lastUpdated: now,
    predictedDevelopment,
  };
};

export const generateDrinkingWindow = (label: WineLabel, bottle: WineBottle, maturation: MaturationModel): DrinkingWindow => {
  const vintageTime = label.vintage * 31536000000;

  return {
    wineId: bottle.id,
    windowStart: vintageTime + label.agingPotential.peakStart * 31536000000,
    windowEnd: vintageTime + label.agingPotential.peakEnd * 31536000000,
    peakDate: vintageTime + ((label.agingPotential.peakStart + label.agingPotential.peakEnd) / 2) * 31536000000,
    confidence: label.agingPotential.confidence,
    drinkingRecommendation:
      maturation.maturityScore >= 85
        ? '已进入最佳适饮期，建议近期饮用'
        : maturation.currentAge < label.agingPotential.peakStart
        ? '尚需继续陈年，耐心等待'
        : '已过最佳适饮期，建议尽快饮用',
    foodPairings: ['牛排', '松露', '奶酪', '蘑菇', '烤羊肉'].slice(0, 3),
    decantingTime: 30 + Math.floor(Math.random() * 90),
    servingTemperature: 16 + Math.random() * 4,
  };
};

export const generateAlerts = (zones: CellarZone[], readings: SensorReading[]): Alert[] => {
  const alerts: Alert[] = [];
  const now = Date.now();

  zones.forEach(zone => {
    const recentReadings = readings
      .filter(r => r.zoneId === zone.id && r.timestamp > now - 86400000)
      .sort((a, b) => b.timestamp - a.timestamp);

    if (recentReadings.length === 0) return;

    const latest = recentReadings[0];

    if (latest.temperature > zone.targetTemperature.max) {
      alerts.push({
        id: generateId(),
        type: 'temperature',
        severity: 'warning',
        message: `${zone.name}温度过高：${latest.temperature.toFixed(1)}°C，目标上限${zone.targetTemperature.max}°C`,
        timestamp: latest.timestamp,
        zoneId: zone.id,
        resolved: false,
      });
    } else if (latest.temperature < zone.targetTemperature.min) {
      alerts.push({
        id: generateId(),
        type: 'temperature',
        severity: 'warning',
        message: `${zone.name}温度过低：${latest.temperature.toFixed(1)}°C，目标下限${zone.targetTemperature.min}°C`,
        timestamp: latest.timestamp,
        zoneId: zone.id,
        resolved: false,
      });
    }

    if (latest.humidity > zone.targetHumidity.max) {
      alerts.push({
        id: generateId(),
        type: 'humidity',
        severity: 'info',
        message: `${zone.name}湿度过高：${latest.humidity.toFixed(0)}%，目标上限${zone.targetHumidity.max}%`,
        timestamp: latest.timestamp,
        zoneId: zone.id,
        resolved: false,
      });
    } else if (latest.humidity < zone.targetHumidity.min) {
      alerts.push({
        id: generateId(),
        type: 'humidity',
        severity: 'warning',
        message: `${zone.name}湿度过低：${latest.humidity.toFixed(0)}%，目标下限${zone.targetHumidity.min}%`,
        timestamp: latest.timestamp,
        zoneId: zone.id,
        resolved: false,
      });
    }
  });

  if (alerts.length === 0) {
    alerts.push({
      id: generateId(),
      type: 'maturation',
      severity: 'info',
      message: '系统检测到3瓶葡萄酒即将进入最佳适饮期，请查看预测模块',
      timestamp: now,
      resolved: false,
    });
  }

  return alerts;
};

export const generateMockDataset = async () => {
  const labels = generateWineLabels(100);
  const zones = generateCellarZones();
  const bottles = generateWineBottles(labels, zones);
  const readings = generateSensorReadings(zones, 30);
  const alerts = generateAlerts(zones, readings);

  const maturationModels: MaturationModel[] = [];
  const drinkingWindows: DrinkingWindow[] = [];

  bottles.forEach(bottle => {
    const label = labels.find(l => l.id === bottle.labelId);
    if (label) {
      const maturation = generateMaturationModel(label, bottle);
      const window = generateDrinkingWindow(label, bottle, maturation);
      maturationModels.push(maturation);
      drinkingWindows.push(window);
    }
  });

  return {
    labels,
    zones,
    bottles,
    readings,
    alerts,
    maturationModels,
    drinkingWindows,
    semanticMappings,
  };
};
