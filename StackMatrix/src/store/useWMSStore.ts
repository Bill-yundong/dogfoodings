import { create } from 'zustand';
import { 
  SKU, Location, Stacker, Task, Metrics, Fragment, 
  AllocationRecommendation, DefragProgress, RealtimeUpdate,
  CategoryStats, LiquidityAnalysis, SKUCategory
} from '../types';
import { allocationEngine } from '../engines/allocationEngine';
import { defragEngine } from '../engines/defragEngine';
import { liquidityEngine } from '../engines/liquidityEngine';
import { associationEngine } from '../engines/associationEngine';
import { 
  generateSKUBatch, generateAssociatedSKUs, generateLocations, generateStackers, 
  generateTasks, generateMetrics, generateFragments,
  generateHistoricalMetrics 
} from '../db/mockData';
import db from '../db/indexedDB';

interface WMSState {
  skus: SKU[];
  locations: Location[];
  stackers: Stacker[];
  tasks: Task[];
  metrics: Metrics;
  historicalMetrics: Metrics[];
  fragments: Fragment[];
  allocationRecommendations: Map<string, AllocationRecommendation[]>;
  defragProgress: DefragProgress;
  realtimeUpdates: RealtimeUpdate[];
  isLoading: boolean;
  currentPage: string;
  selectedSKUId: string | null;
  selectedLocationId: string | null;
  selectedStackerId: string | null;

  skuAnalysisCache: Map<string, LiquidityAnalysis>;
  categoryStats: CategoryStats[];
  liquidityDistribution: { range: string; count: number; percentage: number }[];
  topSKUs: SKU[];
  skuCountByLiquidity: { high: number; medium: number; low: number };

  initData: () => Promise<void>;
  setCurrentPage: (page: string) => void;
  setSelectedSKUId: (id: string | null) => void;
  setSelectedLocationId: (id: string | null) => void;
  setSelectedStackerId: (id: string | null) => void;

  createInboundTask: (skuId: string, locationId: string) => Promise<Task | null>;
  allocateLocation: (skuId: string) => AllocationRecommendation[] | null;
  updateTaskStatus: (taskId: string, status: Task['status']) => void;
  assignTaskToStacker: (taskId: string, stackerId: string) => void;

  startDefrag: () => void;
  pauseDefrag: () => void;
  runDefragStep: () => void;

  refreshMetrics: () => void;
  addRealtimeUpdate: (update: Omit<RealtimeUpdate, 'timestamp'>) => void;

  getSKUById: (id: string) => SKU | undefined;
  getLocationById: (id: string) => Location | undefined;
  getTasksByStatus: (status: Task['status']) => Task[];
  getTasksByStacker: (stackerId: string) => Task[];

  getSKUAnalysis: (skuId: string) => LiquidityAnalysis | undefined;
  filterSKUs: (searchTerm: string, category: string, sortBy: string, limit: number) => SKU[];
}

export const useWMSStore = create<WMSState>((set, get) => ({
  skus: [],
  locations: [],
  stackers: [],
  tasks: [],
  metrics: {
    locationUtilization: 0,
    inboundEfficiency: 0,
    outboundEfficiency: 0,
    avgTaskDuration: 0,
    fragmentRate: 0,
    timestamp: Date.now(),
    totalSKUs: 0,
    activeTasks: 0,
    completedTasksToday: 0
  },
  historicalMetrics: [],
  fragments: [],
  allocationRecommendations: new Map(),
  defragProgress: {
    isRunning: false,
    currentStep: 0,
    totalSteps: 0,
    fragmentsProcessed: 0,
    spaceRecovered: 0,
    startTime: 0
  },
  realtimeUpdates: [],
  isLoading: true,
  currentPage: 'dashboard',
  selectedSKUId: null,
  selectedLocationId: null,
  selectedStackerId: null,

  skuAnalysisCache: new Map(),
  categoryStats: [],
  liquidityDistribution: [],
  topSKUs: [],
  skuCountByLiquidity: { high: 0, medium: 0, low: 0 },

  initData: async () => {
    set({ isLoading: true });
    
    try {
      const CATEGORIES: SKUCategory[] = ['electronics', 'clothing', 'food', 'cosmetics', 'household', 'industrial'];
      const TOTAL_SKUS = 10000;
      const INITIAL_BATCH = 1000;
      const BATCH_SIZE = 1000;
      
      const now = Date.now();
      const categoryIdMap = new Map<SKUCategory, string[]>();
      CATEGORIES.forEach(cat => categoryIdMap.set(cat, []));
      
      const initialSKUs = generateSKUBatch(0, INITIAL_BATCH, now, categoryIdMap);
      
      const locations = generateLocations(8, 20, 5);
      const stackers = generateStackers(6);
      const tasks = generateTasks(200, initialSKUs, locations, stackers);
      const metrics = generateMetrics();
      const historicalMetrics = generateHistoricalMetrics(48);
      const fragments = defragEngine.detectFragments(locations);

      const occupiedSKUs = new Set<string>();
      const updatedLocations = locations.map(loc => {
        if (loc.status === 'occupied') {
          const randomSKU = initialSKUs[Math.floor(Math.random() * initialSKUs.length)];
          if (!occupiedSKUs.has(randomSKU.id)) {
            occupiedSKUs.add(randomSKU.id);
            return {
              ...loc,
              skuId: randomSKU.id,
              skuName: randomSKU.name
            };
          }
        }
        return loc;
      });

      const initialSkuCountByLiquidity = {
        high: initialSKUs.filter(s => s.liquidityScore >= 60).length,
        medium: initialSKUs.filter(s => s.liquidityScore >= 20 && s.liquidityScore < 60).length,
        low: initialSKUs.filter(s => s.liquidityScore < 20).length
      };

      try {
        await db.transaction('rw', db.skus, db.locations, db.tasks, db.metrics, async () => {
          await db.skus.bulkPut(initialSKUs);
          await db.locations.bulkPut(updatedLocations);
          await db.tasks.bulkPut(tasks.slice(0, 100));
          await db.metrics.bulkPut(historicalMetrics);
        });
      } catch (e) {
        console.log('IndexedDB 初始化跳过，使用内存数据');
      }

      set({
        skus: initialSKUs,
        locations: updatedLocations,
        stackers,
        tasks,
        metrics: {
          ...metrics,
          locationUtilization: updatedLocations.filter(l => l.status === 'occupied').length / updatedLocations.length,
          fragmentRate: defragEngine.calculateFragmentRate(updatedLocations),
          totalSKUs: TOTAL_SKUS
        },
        historicalMetrics,
        fragments,
        skuCountByLiquidity: initialSkuCountByLiquidity,
        isLoading: false
      });

      const generateRemainingSKUs = async () => {
        let allSKUs = [...initialSKUs];
        let currentIndex = INITIAL_BATCH;
        
        while (currentIndex < TOTAL_SKUS) {
          const batchCount = Math.min(BATCH_SIZE, TOTAL_SKUS - currentIndex);
          const batch = generateSKUBatch(currentIndex, batchCount, now, categoryIdMap);
          allSKUs = [...allSKUs, ...batch];
          currentIndex += batchCount;
          
          set({
            skus: allSKUs,
            skuCountByLiquidity: {
              high: allSKUs.filter(s => s.liquidityScore >= 60).length,
              medium: allSKUs.filter(s => s.liquidityScore >= 20 && s.liquidityScore < 60).length,
              low: allSKUs.filter(s => s.liquidityScore < 20).length
            }
          });
          
          await new Promise(resolve => setTimeout(resolve, 0));
        }
        
        generateAssociatedSKUs(allSKUs, categoryIdMap);
        set({ skus: [...allSKUs] });
        
        setTimeout(() => {
          const categoryStats = liquidityEngine.getCategoryStats(allSKUs);
          const distribution = liquidityEngine.getLiquidityDistribution(allSKUs);
          const topSKUs = liquidityEngine.getTopSKUs(allSKUs, 10);
          
          set({
            categoryStats,
            liquidityDistribution: distribution,
            topSKUs
          });
        }, 100);
      };
      
      generateRemainingSKUs();

    } catch (error) {
      console.error('初始化数据失败:', error);
      set({ isLoading: false });
    }
  },

  setCurrentPage: (page) => set({ currentPage: page }),
  setSelectedSKUId: (id) => set({ selectedSKUId: id }),
  setSelectedLocationId: (id) => set({ selectedLocationId: id }),
  setSelectedStackerId: (id) => set({ selectedStackerId: id }),

  createInboundTask: async (skuId, locationId) => {
    const { skus, locations } = get();
    const sku = skus.find(s => s.id === skuId);
    const location = locations.find(l => l.id === locationId);
    
    if (!sku || !location || location.status !== 'empty') {
      return null;
    }

    const newTask: Task = {
      id: `TSK-${Date.now()}`,
      type: 'inbound',
      skuId,
      skuName: sku.name,
      toLocation: locationId,
      status: 'pending',
      priority: 3,
      createdAt: Date.now(),
      progress: 0
    };

    set(state => ({
      tasks: [newTask, ...state.tasks],
      locations: state.locations.map(l => 
        l.id === locationId ? { ...l, status: 'reserved' as const } : l
      )
    }));

    get().addRealtimeUpdate({
      type: 'task',
      id: newTask.id,
      data: newTask
    });

    return newTask;
  },

  allocateLocation: (skuId) => {
    const { skus, locations, stackers } = get();
    const sku = skus.find(s => s.id === skuId);
    const idleStacker = stackers.find(s => s.status === 'idle');
    
    if (!sku) return null;

    const recommendations = allocationEngine.allocate(
      sku,
      locations,
      skus,
      idleStacker?.currentPosition || { row: 1, col: 1 }
    );

    set(state => {
      const newRecommendations = new Map(state.allocationRecommendations);
      newRecommendations.set(skuId, recommendations);
      return { allocationRecommendations: newRecommendations };
    });

    return recommendations;
  },

  updateTaskStatus: (taskId, status) => {
    const now = Date.now();
    
    set(state => {
      const updatedTasks = state.tasks.map(t => {
        if (t.id === taskId) {
          const updates: Partial<Task> = { status };
          if (status === 'executing') {
            updates.startedAt = now;
            updates.progress = 10;
          } else if (status === 'completed') {
            updates.completedAt = now;
            updates.progress = 100;
          }
          return { ...t, ...updates };
        }
        return t;
      });

      const task = updatedTasks.find(t => t.id === taskId);
      let updatedLocations = state.locations;

      if (task && status === 'completed') {
        updatedLocations = state.locations.map(l => {
          if (l.id === task.toLocation) {
            return {
              ...l,
              status: 'occupied' as const,
              skuId: task.skuId,
              skuName: task.skuName,
              lastAccessTime: now
            };
          }
          if (task.fromLocation && l.id === task.fromLocation) {
            return {
              ...l,
              status: 'empty' as const,
              skuId: undefined,
              skuName: undefined,
              usedCapacity: 0,
              lastAccessTime: now
            };
          }
          return l;
        });
      }

      return {
        tasks: updatedTasks,
        locations: updatedLocations
      };
    });

    get().addRealtimeUpdate({
      type: 'task',
      id: taskId,
      data: { status }
    });
  },

  assignTaskToStacker: (taskId, stackerId) => {
    set(state => ({
      tasks: state.tasks.map(t => 
        t.id === taskId ? { ...t, stackerId, status: 'executing' as const, startedAt: Date.now() } : t
      ),
      stackers: state.stackers.map(s => {
        if (s.id === stackerId) {
          const task = state.tasks.find(t => t.id === taskId);
          return { ...s, status: 'running' as const, currentTask: task };
        }
        return s;
      })
    }));

    get().addRealtimeUpdate({
      type: 'stacker',
      id: stackerId,
      data: { taskId }
    });
  },

  startDefrag: () => {
    const { fragments } = get();
    set({
      defragProgress: {
        isRunning: true,
        currentStep: 0,
        totalSteps: fragments.length,
        fragmentsProcessed: 0,
        spaceRecovered: 0,
        startTime: Date.now()
      }
    });
  },

  pauseDefrag: () => {
    set(state => ({
      defragProgress: { ...state.defragProgress, isRunning: false }
    }));
  },

  runDefragStep: () => {
    const { fragments, locations, defragProgress } = get();
    
    if (!defragProgress.isRunning || defragProgress.currentStep >= fragments.length) {
      set(state => ({
        defragProgress: { ...state.defragProgress, isRunning: false }
      }));
      return;
    }

    const result = defragEngine.executeDefragStep(fragments, locations, defragProgress.currentStep);
    
    set(state => ({
      locations: result.updatedLocations,
      defragProgress: {
        ...state.defragProgress,
        currentStep: result.newIndex,
        fragmentsProcessed: result.newIndex,
        spaceRecovered: state.defragProgress.spaceRecovered + fragments[defragProgress.currentStep]?.potentialGain || 0
      }
    }));

    if (result.newIndex >= fragments.length) {
      set(state => ({
        defragProgress: { ...state.defragProgress, isRunning: false },
        fragments: defragEngine.detectFragments(result.updatedLocations)
      }));
    }
  },

  refreshMetrics: () => {
    const { locations, tasks, stackers, skus } = get();
    const now = Date.now();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.getTime();

    const occupiedCount = locations.filter(l => l.status === 'occupied').length;
    const completedToday = tasks.filter(t => 
      t.status === 'completed' && (t.completedAt || 0) >= todayStart
    ).length;
    const activeTasks = tasks.filter(t => t.status === 'executing').length;

    const completedTasks = tasks.filter(t => t.status === 'completed' && t.startedAt);
    const avgDuration = completedTasks.length > 0
      ? completedTasks.reduce((sum, t) => {
          const duration = ((t.completedAt || 0) - (t.startedAt || 0)) / (1000 * 60);
          return sum + duration;
        }, 0) / completedTasks.length
      : 0;

    const newMetrics: Metrics = {
      locationUtilization: occupiedCount / locations.length,
      inboundEfficiency: 80 + Math.random() * 20,
      outboundEfficiency: 75 + Math.random() * 20,
      avgTaskDuration: avgDuration,
      fragmentRate: defragEngine.calculateFragmentRate(locations),
      timestamp: now,
      totalSKUs: skus.length,
      activeTasks,
      completedTasksToday: completedToday
    };

    set(state => ({
      metrics: newMetrics,
      historicalMetrics: [...state.historicalMetrics.slice(-47), newMetrics]
    }));
  },

  addRealtimeUpdate: (update) => {
    const newUpdate = { ...update, timestamp: Date.now() };
    set(state => ({
      realtimeUpdates: [newUpdate, ...state.realtimeUpdates].slice(0, 50)
    }));
  },

  getSKUById: (id) => get().skus.find(s => s.id === id),
  getLocationById: (id) => get().locations.find(l => l.id === id),
  getTasksByStatus: (status) => get().tasks.filter(t => t.status === status),
  getTasksByStacker: (stackerId) => get().tasks.filter(t => t.stackerId === stackerId),

  getSKUAnalysis: (skuId) => {
    const state = get();
    const cached = state.skuAnalysisCache.get(skuId);
    if (cached) return cached;

    const sku = state.skus.find(s => s.id === skuId);
    if (!sku) return undefined;

    const analysis = liquidityEngine.analyzeSKU(sku, state.skus, []);
    state.skuAnalysisCache.set(skuId, analysis);
    return analysis;
  },

  filterSKUs: (searchTerm, category, sortBy, limit) => {
    const state = get();
    let filtered = state.skus;

    if (category !== 'all') {
      filtered = filtered.filter(s => s.category === category);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(s => 
        s.name.toLowerCase().includes(term) || 
        s.id.toLowerCase().includes(term)
      );
    }

    if (sortBy === 'liquidity') {
      filtered = [...filtered].sort((a, b) => b.liquidityScore - a.liquidityScore);
    } else if (sortBy === 'name') {
      filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'category') {
      filtered = [...filtered].sort((a, b) => a.category.localeCompare(b.category));
    }

    return limit > 0 ? filtered.slice(0, limit) : filtered;
  }
}));

export default useWMSStore;
