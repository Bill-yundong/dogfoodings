import { SKU, Location, Stacker, Task, Metrics, Fragment, SKUCategory, SKUSnapshot } from '../types';

const CATEGORIES: SKUCategory[] = ['electronics', 'clothing', 'food', 'cosmetics', 'household', 'industrial'];

const CATEGORY_NAMES: Record<SKUCategory, string[]> = {
  electronics: ['智能手机', '笔记本电脑', '平板电脑', '耳机', '智能手表', '相机', '充电宝', '数据线', '键盘', '鼠标'],
  clothing: ['T恤', '牛仔裤', '连衣裙', '外套', '运动鞋', '衬衫', '毛衣', '短裤', '帽子', '围巾'],
  food: ['牛奶', '面包', '鸡蛋', '水果', '蔬菜', '零食', '饮料', '罐头', '调料', '冷冻食品'],
  cosmetics: ['面霜', '口红', '香水', '洗发水', '沐浴露', '面膜', '精华液', '粉底', '睫毛膏', '指甲油'],
  household: ['洗衣液', '卫生纸', '垃圾袋', '洗洁精', '纸巾', '保鲜膜', '铝箔纸', '清洁布', '刷子', '垃圾桶'],
  industrial: ['螺丝', '螺母', '电线', '开关', '插座', '灯泡', '胶带', '胶水', '工具', '零件']
};

export function generateSKUs(count: number): SKU[] {
  const skus: SKU[] = [];
  const now = Date.now();
  
  for (let i = 0; i < count; i++) {
    const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
    const names = CATEGORY_NAMES[category];
    const baseName = names[Math.floor(Math.random() * names.length)];
    const liquidityScore = Math.random() * 100;
    
    skus.push({
      id: `SKU-${String(i + 1).padStart(6, '0')}`,
      name: `${baseName}-${Math.floor(Math.random() * 1000)}`,
      category,
      liquidityScore,
      inCount: Math.floor(Math.random() * 500) + 10,
      outCount: Math.floor(Math.random() * 400) + 5,
      lastMoveTime: now - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000),
      associatedSKUs: [],
      heatLevel: Math.floor(liquidityScore / 20),
      weight: Math.random() * 50 + 0.1,
      volume: Math.random() * 0.5 + 0.01
    });
  }
  
  for (const sku of skus) {
    const sameCategory = skus.filter(s => s.category === sku.category && s.id !== sku.id);
    const assocCount = Math.min(Math.floor(Math.random() * 5) + 1, sameCategory.length);
    const shuffled = sameCategory.sort(() => Math.random() - 0.5);
    sku.associatedSKUs = shuffled.slice(0, assocCount).map(s => s.id);
  }
  
  return skus;
}

export function generateLocations(rows: number, cols: number, levels: number): Location[] {
  const locations: Location[] = [];
  const now = Date.now();
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      for (let level = 0; level < levels; level++) {
        const heatLevel = Math.min(5, Math.floor((level + Math.random() * 2)));
        const rand = Math.random();
        let status: Location['status'] = 'empty';
        if (rand < 0.7) status = 'occupied';
        else if (rand < 0.95) status = 'empty';
        else if (rand < 0.98) status = 'reserved';
        else status = 'defective';
        
        locations.push({
          id: `LOC-${row + 1}-${col + 1}-${level + 1}`,
          row: row + 1,
          col: col + 1,
          level: level + 1,
          status,
          heatLevel,
          lastAccessTime: now - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000),
          capacity: 100,
          usedCapacity: status === 'occupied' ? Math.floor(Math.random() * 80) + 20 : 0
        });
      }
    }
  }
  
  return locations;
}

export function generateStackers(count: number): Stacker[] {
  const statuses: Stacker['status'][] = ['idle', 'running', 'running', 'running', 'paused', 'error'];
  const stackers: Stacker[] = [];
  
  for (let i = 0; i < count; i++) {
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    stackers.push({
      id: `STK-${String(i + 1).padStart(3, '0')}`,
      name: `堆垛机 ${i + 1}`,
      status,
      efficiency: 0.75 + Math.random() * 0.2,
      totalTasks: Math.floor(Math.random() * 5000) + 1000,
      currentPosition: {
        row: Math.floor(Math.random() * 8) + 1,
        col: Math.floor(Math.random() * 20) + 1,
        level: Math.floor(Math.random() * 5) + 1
      },
      errorMessage: status === 'error' ? '传感器故障，需要检修' : undefined
    });
  }
  
  return stackers;
}

export function generateTasks(count: number, skus: SKU[], locations: Location[], stackers: Stacker[]): Task[] {
  const types: Task['type'][] = ['inbound', 'outbound', 'transfer', 'defrag'];
  const statuses: Task['status'][] = ['pending', 'executing', 'completed', 'completed', 'completed', 'failed'];
  const now = Date.now();
  const tasks: Task[] = [];
  
  const occupiedLocations = locations.filter(l => l.status === 'occupied');
  const emptyLocations = locations.filter(l => l.status === 'empty');
  
  for (let i = 0; i < count; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const sku = skus[Math.floor(Math.random() * skus.length)];
    const createdAt = now - Math.floor(Math.random() * 24 * 60 * 60 * 1000);
    const stacker = stackers[Math.floor(Math.random() * stackers.length)];
    
    let startedAt: number | undefined;
    let completedAt: number | undefined;
    
    if (status === 'executing' || status === 'completed' || status === 'failed') {
      startedAt = createdAt + Math.floor(Math.random() * 30 * 60 * 1000);
    }
    if (status === 'completed' || status === 'failed') {
      completedAt = startedAt + Math.floor(Math.random() * 60 * 60 * 1000);
    }
    
    tasks.push({
      id: `TSK-${String(i + 1).padStart(8, '0')}`,
      type,
      skuId: sku.id,
      skuName: sku.name,
      fromLocation: type !== 'inbound' ? occupiedLocations[Math.floor(Math.random() * occupiedLocations.length)]?.id : undefined,
      toLocation: type !== 'outbound' ? emptyLocations[Math.floor(Math.random() * emptyLocations.length)]?.id || locations[0].id : locations[0].id,
      status,
      priority: Math.floor(Math.random() * 5) + 1,
      createdAt,
      startedAt,
      completedAt,
      stackerId: status !== 'pending' ? stacker.id : undefined,
      progress: status === 'completed' ? 100 : status === 'executing' ? Math.floor(Math.random() * 80) + 10 : 0
    });
  }
  
  return tasks.sort((a, b) => b.createdAt - a.createdAt);
}

export function generateMetrics(): Metrics {
  return {
    locationUtilization: 0.65 + Math.random() * 0.2,
    inboundEfficiency: 80 + Math.random() * 40,
    outboundEfficiency: 70 + Math.random() * 45,
    avgTaskDuration: 5 + Math.random() * 10,
    fragmentRate: 0.05 + Math.random() * 0.15,
    timestamp: Date.now(),
    totalSKUs: 10000,
    activeTasks: Math.floor(Math.random() * 20) + 5,
    completedTasksToday: Math.floor(Math.random() * 500) + 100
  };
}

export function generateHistoricalMetrics(hours: number): Metrics[] {
  const metrics: Metrics[] = [];
  const now = Date.now();
  
  for (let i = hours; i >= 0; i--) {
    const baseMetrics = generateMetrics();
    metrics.push({
      ...baseMetrics,
      timestamp: now - i * 60 * 60 * 1000,
      locationUtilization: 0.6 + Math.sin(i / 6) * 0.1 + Math.random() * 0.05,
      inboundEfficiency: 70 + Math.sin(i / 4) * 20 + Math.random() * 10,
      outboundEfficiency: 65 + Math.cos(i / 5) * 25 + Math.random() * 10
    });
  }
  
  return metrics;
}

export function generateFragments(locations: Location[]): Fragment[] {
  const fragments: Fragment[] = [];
  const emptyLocations = locations.filter(l => l.status === 'empty');
  
  for (let i = 0; i < Math.floor(emptyLocations.length / 5); i++) {
    const size = Math.floor(Math.random() * 8) + 2;
    const fragmentLocations = emptyLocations.slice(i * 5, i * 5 + size);
    
    if (fragmentLocations.length > 0) {
      fragments.push({
        id: `FRG-${String(i + 1).padStart(4, '0')}`,
        locationIds: fragmentLocations.map(l => l.id),
        size,
        wasteScore: Math.random() * 100,
        recommendation: Math.random() > 0.3 ? 'merge' : Math.random() > 0.5 ? 'relocate' : 'keep',
        potentialGain: size * (0.5 + Math.random() * 0.5)
      });
    }
  }
  
  return fragments.sort((a, b) => b.wasteScore - a.wasteScore);
}

export function generateSKUSnapshots(skus: SKU[], days: number): SKUSnapshot[] {
  const snapshots: SKUSnapshot[] = [];
  const now = Date.now();
  
  for (const sku of skus.slice(0, 100)) {
    for (let day = 0; day < days; day++) {
      snapshots.push({
        skuId: sku.id,
        timestamp: now - day * 24 * 60 * 60 * 1000,
        liquidityScore: Math.max(0, Math.min(100, sku.liquidityScore + (Math.random() - 0.5) * 20)),
        inCount: Math.floor(Math.random() * 50),
        outCount: Math.floor(Math.random() * 40)
      });
    }
  }
  
  return snapshots;
}
