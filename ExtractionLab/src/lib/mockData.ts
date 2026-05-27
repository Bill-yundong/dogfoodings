import { generateId, getCurrentTimestamp } from './utils';
import type {
  CoffeeBean,
  BrewingPreset,
  StoreLocation,
  BrewingRecord,
  RnDExperiment,
  ExtractionCurve,
  FlavorProfile,
  ExtractionDataPoint,
} from '@/types';

const COFFEE_ORIGINS = [
  { country: '埃塞俄比亚', regions: ['耶加雪菲', '西达摩', '哈拉尔'] },
  { country: '哥伦比亚', regions: ['薇拉', '考卡', '娜玲珑', '麦德林'] },
  { country: '哥斯达黎加', regions: ['塔拉珠', '中央山谷', '三水河'] },
  { country: '肯尼亚', regions: ['涅里', '吉图里', '雅迪尼'] },
  { country: '巴西', regions: ['喜拉多', '米纳斯吉拉斯', '巴伊亚'] },
  { country: '危地马拉', regions: ['安提瓜', '薇薇特南果', '科班'] },
  { country: '巴拿马', regions: ['瑰夏', '博克特', '沃肯'] },
  { country: '印尼', regions: ['曼特宁', '爪哇', '巴厘岛'] },
];

const FLAVOR_NOTES = [
  '花香', '柑橘', '莓果', '焦糖', '巧克力', '坚果',
  '蜂蜜', '香草', '酒香', '茶感', '香料', '木质',
  '热带水果', '核果', '柑橘类', '浆果', '葡萄柚', '柠檬',
  '水蜜桃', '苹果', '梨', '椰子', '枫糖', '奶油',
];

const BEAN_NAMES = [
  '晨曦之光', '山巅之露', '翡翠之心', '金质岁月', '深邃秘境',
  '星空漫游', '云端漫步', '雨林之歌', '火山之魂', '海洋微风',
  '日落大道', '午夜巴黎', '维也纳森林', '普罗旺斯', '香格里拉',
];

const STORE_CITIES = {
  apac: ['上海', '东京', '首尔', '新加坡', '悉尼', '墨尔本', '香港', '曼谷'],
  emea: ['伦敦', '巴黎', '柏林', '米兰', '马德里', '迪拜', '约翰内斯堡', '开罗'],
  na: ['纽约', '洛杉矶', '芝加哥', '多伦多', '温哥华', '墨西哥城'],
  sa: ['圣保罗', '波哥大', '利马', '圣地亚哥', '布宜诺斯艾利斯'],
};

function randomFromArray<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomRange(min: number, max: number, decimals: number = 0): number {
  const value = Math.random() * (max - min) + min;
  return Number(value.toFixed(decimals));
}

function generateFlavorProfile(base: Partial<FlavorProfile> = {}): FlavorProfile {
  return {
    acidity: base.acidity ?? randomRange(5, 9, 1),
    sweetness: base.sweetness ?? randomRange(5, 9, 1),
    bitterness: base.bitterness ?? randomRange(2, 6, 1),
    body: base.body ?? randomRange(4, 8, 1),
    aroma: base.aroma ?? randomRange(6, 9, 1),
    aftertaste: base.aftertaste ?? randomRange(5, 9, 1),
    complexity: base.complexity ?? randomRange(5, 9, 1),
    balance: base.balance ?? randomRange(6, 9, 1),
  };
}

function generateTolerance(): FlavorProfile {
  return {
    acidity: randomRange(0.5, 1.5, 1),
    sweetness: randomRange(0.5, 1.5, 1),
    bitterness: randomRange(0.3, 1, 1),
    body: randomRange(0.5, 1.5, 1),
    aroma: randomRange(0.5, 1.5, 1),
    aftertaste: randomRange(0.5, 1.5, 1),
    complexity: randomRange(0.5, 1.5, 1),
    balance: randomRange(0.5, 1.5, 1),
  };
}

function generateExtractionCurve(
  method: string,
  duration: number
): ExtractionDataPoint[] {
  const points: ExtractionDataPoint[] = [];
  const interval = duration / 30;

  let temp = method === 'espresso' ? randomRange(92, 96, 1) : randomRange(88, 94, 1);
  let pressure = method === 'espresso' ? 9 : 1;
  let flowRate = method === 'espresso' ? 2 : 0.5;
  let weight = 0;
  let tds = 0;

  for (let i = 0; i <= 30; i++) {
    const time = i * interval;

    if (time > duration * 0.1 && time < duration * 0.8) {
      flowRate += randomRange(-0.1, 0.1, 2);
      flowRate = Math.max(0.5, Math.min(5, flowRate));
    }

    weight += flowRate * interval;
    tds = Math.min(12, tds + randomRange(0.01, 0.1, 3));

    if (method === 'espresso') {
      if (time < duration * 0.1) {
        pressure = Math.min(11, pressure + 0.5);
      } else if (time > duration * 0.7) {
        pressure = Math.max(6, pressure - 0.3);
      } else {
        pressure += randomRange(-0.3, 0.3, 1);
      }
    }

    temp += randomRange(-0.5, 0.3, 1);
    temp = Math.max(85, Math.min(98, temp));

    points.push({
      time: Math.round(time * 10) / 10,
      temperature: Math.round(temp * 10) / 10,
      pressure: Math.round(pressure * 10) / 10,
      flowRate: Math.round(flowRate * 100) / 100,
      weight: Math.round(weight * 10) / 10,
      tds: Math.round(tds * 1000) / 1000,
    });
  }

  return points;
}

export function generateMockBeans(count: number): CoffeeBean[] {
  const beans: CoffeeBean[] = [];
  const processes: CoffeeBean['process'][] = ['washed', 'natural', 'honey', 'anaerobic'];
  const roastLevels: CoffeeBean['roastLevel'][] = ['light', 'medium', 'medium-dark', 'dark'];

  const varieties = ['Arabica', 'Robusta', 'Bourbon', 'Typica', 'Caturra', 'Catuai', 'Mundo Novo', 'SL28', 'SL34', 'Geisha'];
  
  for (let i = 0; i < count; i++) {
    const origin = randomFromArray(COFFEE_ORIGINS);
    const numNotes = randomRange(3, 6);
    const flavorNotes: string[] = [];
    while (flavorNotes.length < numNotes) {
      const note = randomFromArray(FLAVOR_NOTES);
      if (!flavorNotes.includes(note)) flavorNotes.push(note);
    }

    const process = randomFromArray(processes);

    beans.push({
      id: generateId(),
      name: `${randomFromArray(BEAN_NAMES)} #${i + 1}`,
      origin: origin.country,
      region: randomFromArray(origin.regions),
      altitude: randomRange(1200, 2200),
      process,
      processingMethod: process,
      variety: randomFromArray(varieties),
      roastLevel: randomFromArray(roastLevels),
      flavorNotes,
      density: randomRange(0.68, 0.82, 3),
      moistureContent: randomRange(10.5, 12.5, 1),
      createdAt: getCurrentTimestamp() - randomRange(0, 86400000 * 90),
      updatedAt: getCurrentTimestamp() - randomRange(0, 86400000 * 7),
    });
  }

  return beans;
}

export function generateMockPresets(beans: CoffeeBean[], count: number): BrewingPreset[] {
  const presets: BrewingPreset[] = [];
  const methods: BrewingPreset['method'][] = ['espresso', 'pour-over', 'french-press', 'aeropress', 'cold-brew'];
  const statuses: BrewingPreset['status'][] = ['approved', 'testing', 'draft', 'archived', 'deprecated'];
  const regions = ['apac', 'emea', 'na', 'sa', 'global'];

  const methodParams: Record<string, { dose: [number, number]; temp: [number, number]; ratio: [number, number]; time: [number, number]; tds: [number, number]; yield: [number, number] }> = {
    espresso: { dose: [17, 20], temp: [92, 96], ratio: [1.5, 2.5], time: [25, 35], tds: [9, 11], yield: [19, 21] },
    'pour-over': { dose: [14, 18], temp: [88, 94], ratio: [15, 18], time: [150, 210], tds: [1.25, 1.4], yield: [19, 21] },
    'french-press': { dose: [20, 30], temp: [88, 92], ratio: [12, 15], time: [240, 360], tds: [1.35, 1.5], yield: [19, 21] },
    aeropress: { dose: [14, 18], temp: [85, 92], ratio: [14, 18], time: [90, 150], tds: [1.35, 1.55], yield: [20, 22] },
    'cold-brew': { dose: [60, 80], temp: [4, 10], ratio: [8, 12], time: [7200, 14400], tds: [1.9, 2.1], yield: [19, 21] },
  };

  for (let i = 0; i < count; i++) {
    const bean = randomFromArray(beans);
    const method = randomFromArray(methods);
    const params = methodParams[method];
    const targetFlavor = generateFlavorProfile();

    const dose = randomRange(params.dose[0], params.dose[1], 1);
    const ratio = randomRange(params.ratio[0], params.ratio[1], 1);
    const totalWater = dose * ratio;

    const targetYieldVal = randomRange(params.yield[0], params.yield[1], 1);
    
    presets.push({
      id: generateId(),
      name: `${bean.name} - ${method}`,
      description: `针对 ${bean.origin} ${bean.region} 产区的优化萃取方案，突出 ${bean.flavorNotes.slice(0, 3).join('、')} 风味特点。`,
      beanId: bean.id,
      bean,
      method,
      grindSize: randomRange(200, 1000),
      dose,
      waterTemperature: randomRange(params.temp[0], params.temp[1], 1),
      totalWater,
      ratio,
      brewRatio: ratio,
      brewTime: randomRange(params.time[0], params.time[1]),
      targetTDS: randomRange(params.tds[0], params.tds[1], 3),
      targetYield: targetYieldVal,
      targetExtractionYield: targetYieldVal,
      pressureProfile: method === 'espresso' ? [
        { time: 0, pressure: 2 },
        { time: 3, pressure: 9 },
        { time: 20, pressure: 9 },
        { time: 28, pressure: 6 },
      ] : undefined,
      temperatureProfile: method !== 'espresso' ? [
        { time: 0, temperature: randomRange(params.temp[0], params.temp[1], 1) },
        { time: 30, temperature: randomRange(params.temp[0], params.temp[1], 1) },
      ] : undefined,
      targetFlavor,
      tolerance: generateTolerance(),
      status: randomFromArray(statuses),
      version: randomRange(1, 10),
      createdBy: `user-${randomRange(1, 20)}`,
      approvedBy: Math.random() > 0.3 ? `admin-${randomRange(1, 5)}` : undefined,
      region: randomFromArray(regions),
      storeIds: Array.from({ length: randomRange(1, 10) }, () => generateId()),
      lastSyncedAt: getCurrentTimestamp() - randomRange(0, 86400000),
      syncHash: '',
      createdAt: getCurrentTimestamp() - randomRange(0, 86400000 * 60),
      updatedAt: getCurrentTimestamp() - randomRange(0, 86400000 * 7),
    });
  }

  return presets;
}

export function generateMockStores(count: number): StoreLocation[] {
  const stores: StoreLocation[] = [];
  const regions = Object.keys(STORE_CITIES) as (keyof typeof STORE_CITIES)[];
  const syncStatuses: StoreLocation['syncStatus'][] = ['online', 'syncing', 'offline', 'error'];
  const equipmentModels = {
    'espresso-machine': ['La Marzocco KB90', 'Slayer Steam EP', 'Nuova Simonelli Aurelia Wave', 'Synesso MVP'],
    'grinder': ['Mahlkonig EK43', 'Mahlkonig K30', 'La Marzocco Swift', 'Compak E8'],
    'scale': ['Acaia Pearl', 'Acaia Lunar', 'Felicita Arc', 'Timemore Black Mirror'],
    'temperature-probe': ['Decent DE1 Probe', 'Thermoworks Signals', 'Comark PDT300'],
  };

  for (let i = 0; i < count; i++) {
    const region = randomFromArray(regions);
    const city = randomFromArray(STORE_CITIES[region]);
    const storeNum = i + 1;

    const altitudeVal = randomRange(5, 2000);
    const atmosphericPressure = 1013.25 * Math.exp(-0.00012 * altitudeVal);
    const qualityScoreVal = randomRange(75, 98, 1);
    
    stores.push({
      id: generateId(),
      name: `ExtractionLab ${city} #${storeNum}`,
      region,
      country: city,
      city,
      timezone: `Asia/${city}`,
      altitude: altitudeVal,
      atmosphericPressure,
      waterHardness: randomRange(60, 180),
      waterAlkalinity: randomRange(50, 110),
      lastSyncAt: getCurrentTimestamp() - randomRange(0, 3600000),
      syncStatus: Math.random() > 0.1 ? 'online' : randomFromArray(syncStatuses),
      activePresets: Array.from({ length: randomRange(3, 15) }, () => generateId()),
      equipment: [
        {
          id: generateId(),
          name: '主咖啡机',
          type: 'espresso-machine',
          model: randomFromArray(equipmentModels['espresso-machine']),
          status: 'operational',
          serialNumber: `ESP-${randomRange(1000, 9999)}`,
          calibrationDate: getCurrentTimestamp() - randomRange(0, 86400000 * 30),
          nextCalibrationDate: getCurrentTimestamp() + randomRange(86400000 * 30, 86400000 * 90),
        },
        {
          id: generateId(),
          name: '主磨豆机',
          type: 'grinder',
          model: randomFromArray(equipmentModels.grinder),
          status: Math.random() > 0.9 ? 'maintenance' : 'operational',
          serialNumber: `GRD-${randomRange(1000, 9999)}`,
          calibrationDate: getCurrentTimestamp() - randomRange(0, 86400000 * 14),
          nextCalibrationDate: getCurrentTimestamp() + randomRange(86400000 * 14, 86400000 * 60),
        },
        {
          id: generateId(),
          name: '电子秤',
          type: 'scale',
          model: randomFromArray(equipmentModels.scale),
          status: 'operational',
          serialNumber: `SCL-${randomRange(1000, 9999)}`,
          calibrationDate: getCurrentTimestamp() - randomRange(0, 86400000 * 7),
          nextCalibrationDate: getCurrentTimestamp() + randomRange(86400000 * 7, 86400000 * 30),
        },
      ],
      qualityScore: qualityScoreVal,
      consistencyScore: randomRange(80, 98, 1),
      qualityIssues: qualityScoreVal < 85 ? ['设备校准待维护', '水温波动'] : undefined,
      lastQualityCheck: new Date(Date.now() - randomRange(0, 86400000 * 7)).toISOString(),
      createdAt: getCurrentTimestamp() - randomRange(86400000 * 30, 86400000 * 365),
      updatedAt: getCurrentTimestamp() - randomRange(0, 86400000 * 7),
    });
  }

  return stores;
}

export function generateMockRecords(
  presets: BrewingPreset[],
  stores: StoreLocation[],
  count: number
): BrewingRecord[] {
  const records: BrewingRecord[] = [];

  for (let i = 0; i < count; i++) {
    const preset = randomFromArray(presets);
    const store = randomFromArray(stores);
    const actualFlavor = generateFlavorProfile(preset.targetFlavor);
    const curve = generateExtractionCurve(preset.method, preset.brewTime);

    const actualTDS = preset.targetTDS + randomRange(-0.3, 0.3, 3);
    const actualYield = preset.targetYield + randomRange(-1, 1, 1);

    const qualityScore = 100 - (
      Math.abs(actualFlavor.acidity - preset.targetFlavor.acidity) * 3 +
      Math.abs(actualFlavor.sweetness - preset.targetFlavor.sweetness) * 3 +
      Math.abs(actualTDS - preset.targetTDS) * 10 +
      Math.abs(actualYield - preset.targetYield) * 3
    );

    const baristaNames = ['张伟', '李娜', '王芳', '刘洋', '陈静', '杨帆', '赵磊', '周敏', '吴涛', '郑丽'];
    const brewTimeVal = preset.brewTime + randomRange(-3, 3);
    const createdAt = getCurrentTimestamp() - randomRange(0, 86400000 * 30);
    
    records.push({
      id: generateId(),
      presetId: preset.id,
      storeId: store.id,
      beanBatchId: `BATCH-${randomRange(1000, 9999)}`,
      baristaId: `BARISTA-${randomRange(1, 50)}`,
      barista: randomFromArray(baristaNames),
      brewedAt: new Date(createdAt).toISOString(),
      startTime: createdAt,
      endTime: createdAt + brewTimeVal * 1000,
      actualDose: preset.dose + randomRange(-0.5, 0.5, 1),
      actualWater: preset.totalWater + randomRange(-5, 5, 1),
      actualTemperature: preset.waterTemperature + randomRange(-1, 1, 1),
      actualBrewTime: brewTimeVal,
      brewTime: brewTimeVal,
      extractionCurve: curve,
      finalTDS: actualTDS,
      extractionYield: actualYield,
      flavorRating: actualFlavor,
      qualityScore: Math.max(0, Math.min(100, qualityScore)),
      notes: Math.random() > 0.7 ? '冲煮正常，风味符合预期' : '',
      createdAt,
    });
  }

  return records;
}

export function generateMockExtractionCurves(
  presets: BrewingPreset[],
  stores: StoreLocation[],
  count: number
): ExtractionCurve[] {
  const curves: ExtractionCurve[] = [];

  for (let i = 0; i < count; i++) {
    const preset = randomFromArray(presets);
    const store = randomFromArray(stores);
    const dataPoints = generateExtractionCurve(preset.method, preset.brewTime);
    const lastPoint = dataPoints[dataPoints.length - 1];

    curves.push({
      id: generateId(),
      presetId: preset.id,
      storeId: store.id,
      beanId: preset.beanId,
      dataPoints,
      startTime: getCurrentTimestamp() - randomRange(0, 86400000 * 30),
      endTime: getCurrentTimestamp() - randomRange(0, 86400000 * 30) + preset.brewTime * 1000,
      totalWeight: lastPoint.weight,
      averageFlowRate: dataPoints.reduce((sum, p) => sum + p.flowRate, 0) / dataPoints.length,
      peakPressure: Math.max(...dataPoints.map(p => p.pressure)),
      finalTDS: lastPoint.tds,
      extractionYield: preset.targetYield + randomRange(-1.5, 1.5, 1),
    });
  }

  return curves;
}

export function generateMockExperiments(
  beans: CoffeeBean[],
  presets: BrewingPreset[],
  count: number
): RnDExperiment[] {
  const experiments: RnDExperiment[] = [];
  const statuses: RnDExperiment['status'][] = ['planned', 'running', 'completed', 'analyzed', 'paused'];
  const variableConfigs = [
    { name: '水温', min: 88, max: 96, step: 0.5, unit: '°C' },
    { name: '研磨度', min: 200, max: 1200, step: 10, unit: 'μm' },
    { name: '粉水比', min: 12, max: 18, step: 0.5, unit: 'ratio' },
    { name: '萃取时间', min: 20, max: 40, step: 1, unit: 's' },
  ];

  for (let i = 0; i < count; i++) {
    const bean = randomFromArray(beans);
    const basePreset = randomFromArray(presets.filter(p => p.beanId === bean.id)) || presets[0];
    const status = randomFromArray(statuses);
    const trials = randomRange(20, 100);
    const completedTrials = status === 'planned' ? 0 : status === 'running' || status === 'paused' ? randomRange(5, trials - 5) : trials;
    const createdAt = getCurrentTimestamp() - randomRange(86400000 * 30, 86400000 * 180);
    const variable1 = randomFromArray(variableConfigs);
    const variable2 = randomFromArray(variableConfigs.filter(v => v.name !== variable1.name));

    experiments.push({
      id: generateId(),
      name: `${bean.name} 最佳萃取方案实验 #${i + 1}`,
      description: `针对${bean.name}咖啡豆的多变量萃取优化实验，探索最佳冲煮参数组合。`,
      hypothesis: `通过调整${variable1.name}和${variable2.name}，可以显著提升${bean.flavorNotes[0]}风味的表现。`,
      beanId: bean.id,
      basePresetId: basePreset.id,
      variants: [
        {
          id: generateId(),
          name: '对照组',
          parameters: {},
          trialCount: randomRange(10, 30),
          averageScore: randomRange(75, 92, 1),
          results: [],
        },
        {
          id: generateId(),
          name: '实验组 A - 高温',
          parameters: { waterTemperature: basePreset.waterTemperature + 2 },
          trialCount: randomRange(10, 30),
          averageScore: randomRange(75, 92, 1),
          results: [],
        },
        {
          id: generateId(),
          name: '实验组 B - 低温',
          parameters: { waterTemperature: basePreset.waterTemperature - 2 },
          trialCount: randomRange(10, 30),
          averageScore: randomRange(75, 92, 1),
          results: [],
        },
        {
          id: generateId(),
          name: '实验组 C - 细研磨',
          parameters: { grindSize: basePreset.grindSize - 50 },
          trialCount: randomRange(10, 30),
          averageScore: randomRange(75, 92, 1),
          results: [],
        },
      ],
      variables: [variable1, variable2],
      status,
      trials,
      completedTrials,
      startedAt: status !== 'planned' ? getCurrentTimestamp() - randomRange(86400000 * 1, 86400000 * 30) : undefined,
      completedAt: status === 'completed' || status === 'analyzed' ? getCurrentTimestamp() - randomRange(0, 86400000 * 7) : undefined,
      conclusion: status === 'analyzed' ? `实验表明，实验组 ${randomFromArray(['A', 'B', 'C'])} 的综合评分最高，建议采纳该方案。` : undefined,
      recommendedPresetId: status === 'analyzed' ? generateId() : undefined,
      createdBy: `rnd-${randomRange(1, 10)}`,
      createdAt: new Date(createdAt).toISOString(),
    });
  }

  return experiments;
}

export async function initializeMockDatabase(): Promise<void> {
  const { bulkInsert, clearDatabase } = await import('./database');

  await clearDatabase();

  const beans = generateMockBeans(50);
  const beanIds = await bulkInsert('beans', beans);
  console.log(`Generated ${beanIds.length} coffee beans`);

  const presets = generateMockPresets(beans, 200);
  const presetIds = await bulkInsert('presets', presets);
  console.log(`Generated ${presetIds.length} brewing presets`);

  const stores = generateMockStores(30);
  const storeIds = await bulkInsert('stores', stores);
  console.log(`Generated ${storeIds.length} stores`);

  const records = generateMockRecords(presets, stores, 500);
  const recordIds = await bulkInsert('records', records);
  console.log(`Generated ${recordIds.length} brewing records`);

  const curves = generateMockExtractionCurves(presets, stores, 1000);
  const curveIds = await bulkInsert('extractionCurves', curves);
  console.log(`Generated ${curveIds.length} extraction curves`);

  const experiments = generateMockExperiments(beans, presets, 20);
  const expIds = await bulkInsert('experiments', experiments);
  console.log(`Generated ${expIds.length} R&D experiments`);

  console.log('Mock database initialized with 1780+ records');
}
