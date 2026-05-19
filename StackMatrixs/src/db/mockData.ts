import type {
  Location,
  SKU,
  Stacker,
  InboundTask,
  FragmentationInfo,
  Alert,
  AssociationResult,
  OrderHistoryItem,
  StackerTask,
} from '@/types';
import { generateMockOrderHistory } from '@/algorithms/associationAnalysis';

const CATEGORIES = [
  '电子产品',
  '服装鞋帽',
  '食品饮料',
  '家居用品',
  '美妆个护',
  '母婴用品',
  '图书文具',
  '运动户外',
  '汽车用品',
  '医药保健',
];

const SKU_NAMES: Record<string, string[]> = {
  电子产品: ['iPhone 15 Pro', 'MacBook Pro', 'AirPods Pro', 'iPad Air', 'Galaxy S24'],
  服装鞋帽: ['运动T恤', '牛仔裤', '运动鞋', '羽绒服', '连衣裙'],
  食品饮料: ['牛奶', '面包', '矿泉水', '方便面', '坚果礼盒'],
  家居用品: ['床上四件套', '收纳箱', '洗衣液', '卫生纸', '厨房用品'],
  美妆个护: ['面膜', '洗面奶', '口红', '香水', '护肤套装'],
  母婴用品: ['纸尿裤', '婴儿奶粉', '儿童玩具', '婴儿车', '童装'],
  图书文具: ['畅销小说', '笔记本', '钢笔', '打印机', '办公用品'],
  运动户外: ['跑步机', '瑜伽垫', '登山包', '自行车', '健身器材'],
  汽车用品: ['汽车坐垫', '行车记录仪', '车载香水', '机油', '轮胎'],
  医药保健: ['维生素', '感冒药', '创可贴', '保健品', '体温计'],
};

export function generateLocations(count: number = 2000): Location[] {
  const locations: Location[] = [];
  const aisles = 10;
  const racksPerAisle = 20;
  const levelsPerRack = 5;
  const slotsPerLevel = 4;

  let id = 0;
  for (let aisle = 1; aisle <= aisles; aisle++) {
    for (let rack = 1; rack <= racksPerAisle; rack++) {
      for (let level = 1; level <= levelsPerRack; level++) {
        for (let slot = 1; slot <= slotsPerLevel; slot++) {
          if (id >= count) break;

          const rand = Math.random();
          let status: Location['status'] = 'empty';
          if (rand < 0.65) status = 'occupied';
          else if (rand < 0.7) status = 'reserved';
          else if (rand < 0.72) status = 'maintenance';

          const capacity = 100 + Math.floor(Math.random() * 200);
          const usedCapacity =
            status === 'occupied' ? Math.floor(capacity * (0.5 + Math.random() * 0.4)) : 0;

          const distToEntrance = (aisle - 1) * 2 + (rack - 1) * 0.5 + (level - 1) * 0.3;
          const heatLevel = Math.max(
            0,
            Math.min(100, Math.floor(100 - distToEntrance * 3 + Math.random() * 20 - 10))
          );

          locations.push({
            id: `LOC-${String(aisle).padStart(2, '0')}-${String(rack).padStart(2, '0')}-${String(level).padStart(2, '0')}-${String(slot).padStart(2, '0')}`,
            aisle,
            rack,
            level,
            slot,
            status,
            capacity,
            usedCapacity,
            heatLevel,
            lastUpdated: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
          });
          id++;
        }
        if (id >= count) break;
      }
      if (id >= count) break;
    }
    if (id >= count) break;
  }

  return locations;
}

export function generateSKUs(count: number = 1000): SKU[] {
  const skus: SKU[] = [];

  for (let i = 0; i < count; i++) {
    const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
    const names = SKU_NAMES[category] || ['商品'];
    const name = names[Math.floor(Math.random() * names.length)];
    const turnoverRate = Math.random() * 10;
    const lastInbound = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
    const lastOutbound = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);
    const liquidityScore = Math.floor(
      turnoverRate * 15 + (1 - (lastOutbound.getTime() / Date.now())) * 30 + Math.random() * 30
    );

    skus.push({
      id: `SKU-${String(i + 1).padStart(6, '0')}`,
      name: `${name} ${i + 1}`,
      category,
      dimensions: {
        length: 10 + Math.floor(Math.random() * 40),
        width: 10 + Math.floor(Math.random() * 40),
        height: 5 + Math.floor(Math.random() * 30),
      },
      weight: 0.1 + Math.random() * 20,
      turnoverRate: Math.round(turnoverRate * 100) / 100,
      lastInbound,
      lastOutbound,
      liquidityScore: Math.max(0, Math.min(100, liquidityScore)),
      totalStock: Math.floor(10 + Math.random() * 500),
      unit: ['件', '个', '箱', '盒', '套'][Math.floor(Math.random() * 5)],
    });
  }

  return skus;
}

export function generateStackers(count: number = 6): Stacker[] {
  const statuses: Stacker['status'][] = ['idle', 'running', 'paused', 'fault', 'maintenance'];
  const stackers: Stacker[] = [];

  for (let i = 0; i < count; i++) {
    const statusRand = Math.random();
    let status: Stacker['status'];
    if (statusRand < 0.6) status = 'running';
    else if (statusRand < 0.85) status = 'idle';
    else if (statusRand < 0.92) status = 'paused';
    else if (statusRand < 0.97) status = 'maintenance';
    else status = 'fault';

    stackers.push({
      id: `STK-${String(i + 1).padStart(3, '0')}`,
      name: `堆垛机 ${i + 1}`,
      status,
      currentPosition: {
        aisle: Math.floor(Math.random() * 10) + 1,
        rack: Math.floor(Math.random() * 20) + 1,
        level: Math.floor(Math.random() * 5) + 1,
      },
      taskQueue: generateStackerTasks(Math.floor(Math.random() * 5)),
      efficiency: 70 + Math.floor(Math.random() * 30),
      totalTasks: 500 + Math.floor(Math.random() * 2000),
      completedTasks: 450 + Math.floor(Math.random() * 1800),
      faultCount: Math.floor(Math.random() * 20),
      lastMaintenance: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      uptime: 95 + Math.random() * 5,
    });
  }

  return stackers;
}

function generateStackerTasks(count: number): StackerTask[] {
  const types: StackerTask['type'][] = ['inbound', 'outbound', 'transfer', 'defrag'];
  const statuses: StackerTask['status'][] = ['pending', 'executing', 'completed'];
  const tasks: StackerTask[] = [];

  for (let i = 0; i < count; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    const status =
      i === 0 && Math.random() > 0.5 ? 'executing' : statuses[Math.floor(Math.random() * 3)];

    tasks.push({
      id: `TASK-${Date.now()}-${i}`,
      type,
      status,
      fromLocation: `LOC-${String(Math.floor(Math.random() * 10) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 20) + 1).padStart(2, '0')}-01-01`,
      toLocation: `LOC-${String(Math.floor(Math.random() * 10) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 20) + 1).padStart(2, '0')}-01-01`,
      skuId: `SKU-${String(Math.floor(Math.random() * 1000) + 1).padStart(6, '0')}`,
      quantity: Math.floor(Math.random() * 100) + 1,
      priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as StackerTask['priority'],
      createdAt: new Date(Date.now() - Math.random() * 3600000),
      startedAt: status !== 'pending' ? new Date(Date.now() - Math.random() * 1800000) : undefined,
      completedAt: status === 'completed' ? new Date() : undefined,
      estimatedDuration: 30000 + Math.floor(Math.random() * 60000),
    });
  }

  return tasks;
}

export function generateInboundTasks(count: number = 20): InboundTask[] {
  const tasks: InboundTask[] = [];
  const statuses: InboundTask['status'][] = [
    'pending',
    'allocating',
    'allocated',
    'executing',
    'completed',
  ];
  const strategies: InboundTask['strategy'][] = [
    'liquidity',
    'association',
    'space',
    'balanced',
  ];

  for (let i = 0; i < count; i++) {
    const statusRand = Math.random();
    let status: InboundTask['status'];
    if (statusRand < 0.3) status = 'pending';
    else if (statusRand < 0.5) status = 'allocated';
    else if (statusRand < 0.7) status = 'executing';
    else status = 'completed';

    tasks.push({
      id: `INB-${String(Date.now()).slice(-8)}-${String(i).padStart(4, '0')}`,
      skuId: `SKU-${String(Math.floor(Math.random() * 1000) + 1).padStart(6, '0')}`,
      quantity: Math.floor(Math.random() * 200) + 1,
      status,
      allocatedLocation:
        status !== 'pending'
          ? `LOC-${String(Math.floor(Math.random() * 10) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 20) + 1).padStart(2, '0')}-01-01`
          : undefined,
      stackerId:
        status === 'executing' || status === 'completed'
          ? `STK-${String(Math.floor(Math.random() * 6) + 1).padStart(3, '0')}`
          : undefined,
      priority: ['normal', 'high', 'urgent'][Math.floor(Math.random() * 3)] as InboundTask['priority'],
      strategy: strategies[Math.floor(Math.random() * strategies.length)],
      createdAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
      startedAt: status !== 'pending' ? new Date(Date.now() - Math.random() * 12 * 60 * 60 * 1000) : undefined,
      completedAt: status === 'completed' ? new Date() : undefined,
      estimatedTime: 30 + Math.floor(Math.random() * 120),
    });
  }

  return tasks.sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );
}

export function generateAlerts(count: number = 10): Alert[] {
  const alerts: Alert[] = [];
  const types: Alert['type'][] = ['info', 'warning', 'danger', 'success'];
  const sources: Alert['source'][] = ['wms', 'stacker', 'allocation', 'defrag'];

  const alertTemplates = [
    { title: '入库任务完成', message: '入库任务 INB-20240101-0001 已完成' },
    { title: '堆垛机故障', message: '堆垛机 STK-003 发生故障，需要维修' },
    { title: '货位不足', message: 'A 区货位利用率超过 90%，建议扩容' },
    { title: '碎片整理完成', message: '碎片整理任务 DEFRAG-001 已完成，释放空间 500 单位' },
    { title: '高优先级任务', message: '紧急入库任务需要优先处理' },
    { title: '系统告警', message: '检测到异常操作，请注意查看' },
    { title: '效率提升', message: '今日作业效率提升 15%' },
    { title: 'SKU 流动性变化', message: 'SKU-000001 流动性评分下降明显' },
  ];

  for (let i = 0; i < count; i++) {
    const template = alertTemplates[Math.floor(Math.random() * alertTemplates.length)];
    const type = types[Math.floor(Math.random() * types.length)];
    const source = sources[Math.floor(Math.random() * sources.length)];

    alerts.push({
      id: `ALERT-${Date.now()}-${i}`,
      type,
      title: template.title,
      message: template.message,
      source,
      timestamp: new Date(Date.now() - Math.random() * 60 * 60 * 1000),
      read: Math.random() > 0.5,
    });
  }

  return alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

export function generateAssociationRules(
  skus: SKU[],
  ruleCount: number = 200
): AssociationResult[] {
  const orders = generateMockOrderHistory(skus, 500);
  const rules: AssociationResult[] = [];

  for (let i = 0; i < ruleCount; i++) {
    const sku1 = skus[Math.floor(Math.random() * skus.length)];
    let sku2 = skus[Math.floor(Math.random() * skus.length)];
    while (sku2.id === sku1.id) {
      sku2 = skus[Math.floor(Math.random() * skus.length)];
    }

    const sameCategory = sku1.category === sku2.category;
    const baseConfidence = sameCategory ? 0.4 + Math.random() * 0.5 : 0.1 + Math.random() * 0.3;

    rules.push({
      skuId1: sku1.id,
      skuId2: sku2.id,
      confidence: Math.round(baseConfidence * 100) / 100,
      support: Math.round((0.01 + Math.random() * 0.1) * 100) / 100,
      lift: Math.round((1 + Math.random() * 3) * 100) / 100,
      orderCount: Math.floor(10 + Math.random() * 200),
    });
  }

  return rules.sort((a, b) => b.confidence - a.confidence);
}

export function generateOrderHistory(skus: SKU[]): OrderHistoryItem[] {
  return generateMockOrderHistory(skus, 1000);
}

export function generateEfficiencyMetrics(days: number = 7): Array<{ timestamp: Date; metricType: string; value: number }> {
  const metrics: Array<{ timestamp: Date; metricType: string; value: number }> = [];
  const metricTypes = ['throughput', 'utilization', 'efficiency', 'fragmentation'];

  for (let day = 0; day < days; day++) {
    for (let hour = 0; hour < 24; hour += 2) {
      const timestamp = new Date(Date.now() - day * 24 * 60 * 60 * 1000 - hour * 60 * 60 * 1000);

      for (const type of metricTypes) {
        let value: number;
        switch (type) {
          case 'throughput':
            value = 50 + Math.floor(Math.random() * 100);
            break;
          case 'utilization':
            value = 60 + Math.floor(Math.random() * 30);
            break;
          case 'efficiency':
            value = 70 + Math.floor(Math.random() * 25);
            break;
          case 'fragmentation':
            value = 10 + Math.floor(Math.random() * 20);
            break;
          default:
            value = 50;
        }
        metrics.push({ timestamp, metricType: type, value });
      }
    }
  }

  return metrics;
}

export function generateFragmentationInfos(locations: Location[]): FragmentationInfo[] {
  const emptyLocs = locations.filter((l) => l.status === 'empty');
  const fragments: FragmentationInfo[] = [];

  const aisles = new Set(locations.map((l) => l.aisle));
  let id = 0;

  for (const aisle of aisles) {
    const aisleLocs = emptyLocs.filter((l) => l.aisle === aisle);
    if (aisleLocs.length > 0) {
      const fragmentCount = Math.min(5, Math.floor(aisleLocs.length / 10));
      for (let i = 0; i < fragmentCount; i++) {
        const loc = aisleLocs[Math.floor(Math.random() * aisleLocs.length)];
        const severity = ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as FragmentationInfo['severity'];
        fragments.push({
          id: `FRAG-${String(id++).padStart(4, '0')}`,
          locationId: loc.id,
          locationInfo: loc,
          fragmentType: ['single', 'cluster', 'aisle'][Math.floor(Math.random() * 3)] as FragmentationInfo['fragmentType'],
          severity,
          wastedCapacity: severity === 'high' ? 300 + Math.random() * 300 : severity === 'medium' ? 100 + Math.random() * 200 : 20 + Math.random() * 80,
          recommendedAction: ['consolidate', 'reallocate', 'defrag'][Math.floor(Math.random() * 3)] as FragmentationInfo['recommendedAction'],
          detectedAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
        });
      }
    }
  }

  return fragments;
}
