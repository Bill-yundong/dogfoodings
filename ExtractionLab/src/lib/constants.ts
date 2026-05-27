export const COFFEE_PROCESSES = [
  { value: 'washed', label: '水洗', color: 'bg-blue-500' },
  { value: 'natural', label: '日晒', color: 'bg-yellow-500' },
  { value: 'honey', label: '蜜处理', color: 'bg-amber-600' },
  { value: 'anaerobic', label: '厌氧发酵', color: 'bg-purple-500' },
] as const;

export const PROCESSING_METHODS = [
  { id: 'washed', name: '水洗', color: 'bg-blue-500' },
  { id: 'natural', name: '日晒', color: 'bg-yellow-500' },
  { id: 'honey', name: '蜜处理', color: 'bg-amber-600' },
  { id: 'anaerobic', name: '厌氧发酵', color: 'bg-purple-500' },
] as const;

export const ROAST_LEVELS = [
  { id: 'light', value: 'light', name: '浅烘', label: '浅烘', color: '#c9a66b' },
  { id: 'medium', value: 'medium', name: '中烘', label: '中烘', color: '#8b6914' },
  { id: 'medium-dark', value: 'medium-dark', name: '中深烘', label: '中深烘', color: '#5d4e37' },
  { id: 'dark', value: 'dark', name: '深烘', label: '深烘', color: '#3d2a23' },
] as const;

export const BREWING_METHODS = [
  { id: 'espresso', value: 'espresso', name: '意式浓缩', label: '意式浓缩', icon: '☕' },
  { id: 'pour-over', value: 'pour-over', name: '手冲', label: '手冲', icon: '🫖' },
  { id: 'french-press', value: 'french-press', name: '法压壶', label: '法压壶', icon: '🍵' },
  { id: 'aeropress', value: 'aeropress', name: '爱乐压', label: '爱乐压', icon: '🧪' },
  { id: 'cold-brew', value: 'cold-brew', name: '冷萃', label: '冷萃', icon: '🧊' },
] as const;

export const FLAVOR_DIMENSIONS = [
  { key: 'acidity', label: '酸度', color: '#f59e0b' },
  { key: 'sweetness', label: '甜度', color: '#ec4899' },
  { key: 'bitterness', label: '苦度', color: '#6b7280' },
  { key: 'body', label: '醇厚度', color: '#8b5cf6' },
  { key: 'aroma', label: '香气', color: '#10b981' },
  { key: 'aftertaste', label: '余韵', color: '#3b82f6' },
  { key: 'complexity', label: '复杂度', color: '#f97316' },
  { key: 'balance', label: '平衡度', color: '#06b6d4' },
] as const;

export const REGIONS = [
  { id: 'apac', name: '亚太区', countries: ['CN', 'JP', 'KR', 'SG', 'AU', 'NZ'] },
  { id: 'emea', name: '欧非中东区', countries: ['GB', 'FR', 'DE', 'IT', 'ES', 'AE', 'ZA'] },
  { id: 'na', name: '北美区', countries: ['US', 'CA', 'MX'] },
  { id: 'sa', name: '拉美区', countries: ['BR', 'CO', 'PE', 'CL', 'AR'] },
] as const;

export const EXTRACTION_OPTIMAL_RANGES = {
  espresso: { tds: { min: 8, max: 12 }, yield: { min: 18, max: 22 } },
  'pour-over': { tds: { min: 1.2, max: 1.45 }, yield: { min: 18, max: 22 } },
  'french-press': { tds: { min: 1.3, max: 1.55 }, yield: { min: 18, max: 22 } },
  aeropress: { tds: { min: 1.3, max: 1.6 }, yield: { min: 18, max: 24 } },
  'cold-brew': { tds: { min: 1.8, max: 2.2 }, yield: { min: 18, max: 22 } },
} as const;

export const OPTIMIZATION_FACTORS = [
  { key: 'altitude', label: '海拔', min: 0, max: 4000, unit: 'm', impact: 'pressure', weight: 0.07 },
  { key: 'waterHardness', label: '水质硬度', min: 50, max: 200, unit: 'ppm', impact: 'extraction', weight: 0.10 },
  { key: 'waterAlkalinity', label: '水质碱度', min: 40, max: 120, unit: 'ppm', impact: 'acidity', weight: 0.08 },
  { key: 'temperature', label: '水温', min: 88, max: 96, unit: '°C', impact: 'solubility', weight: 0.18 },
  { key: 'grindSize', label: '研磨度', min: 200, max: 1200, unit: 'μm', impact: 'surface-area', weight: 0.18 },
  { key: 'dose', label: '粉量', min: 14, max: 22, unit: 'g', impact: 'strength', weight: 0.12 },
  { key: 'ratio', label: '粉水比', min: 1, max: 3, unit: 'ratio', impact: 'strength', weight: 0.12 },
  { key: 'brewTime', label: '萃取时间', min: 20, max: 180, unit: 's', impact: 'extraction', weight: 0.15 },
] as const;

export const DATABASE_CONFIG = {
  name: 'ExtractionLabDB',
  version: 1,
  stores: {
    presets: { keyPath: 'id', indexes: ['beanId', 'status', 'region', 'updatedAt'] },
    beans: { keyPath: 'id', indexes: ['origin', 'roastLevel', 'process'] },
    stores: { keyPath: 'id', indexes: ['region', 'syncStatus', 'qualityScore'] },
    records: { keyPath: 'id', indexes: ['presetId', 'storeId', 'createdAt'] },
    syncQueue: { keyPath: 'id', indexes: ['status', 'type', 'createdAt'] },
    experiments: { keyPath: 'id', indexes: ['beanId', 'status', 'createdAt'] },
    reports: { keyPath: 'id', indexes: ['storeId', 'presetId', 'period'] },
    extractionCurves: { keyPath: 'id', indexes: ['presetId', 'startTime'] },
  },
} as const;

export const SYNC_CONFIG = {
  batchSize: 50,
  retryAttempts: 3,
  retryDelay: 5000,
  heartbeatInterval: 30000,
  conflictResolution: 'latest-wins' as const,
};
