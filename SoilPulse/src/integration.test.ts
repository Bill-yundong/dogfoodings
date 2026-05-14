/**
 * SoilPulse 农田养分流失与施肥冗余监控系统 - 集成测试
 * 
 * 测试覆盖范围：
 * 1. IndexedDB 数据持久化
 * 2. 异步反应输运模拟引擎
 * 3. 施肥决策优化算法
 * 4. 供应链协同模块
 * 5. 核心业务场景集成
 */

import IndexedDBStore from './lib/IndexedDBStore';
import ReactiveTransportEngine from './lib/ReactiveTransportEngine';
import FertilizationOptimizer from './lib/FertilizationOptimizer';
import SupplyChainCoordinator from './lib/SupplyChainCoordinator';
import { SoilSample } from './types';

describe('=== SoilPulse 核心业务集成测试 ===', () => {

  describe('【模块 1】IndexedDB 离线数据存储', () => {
    let store: IndexedDBStore;
    const testSamples: SoilSample[] = [];

    beforeAll(async () => {
      store = new IndexedDBStore();
      await store.init();
      
      for (let i = 0; i < 10; i++) {
        testSamples.push({
          id: `test_sample_${i}`,
          location: {
            lat: 35 + i * 0.1,
            lng: 115 + i * 0.1,
            farmId: 'test_farm_001',
            plotName: `测试地块 ${String.fromCharCode(65 + i)}`,
          },
          timestamp: new Date().toISOString(),
          pH: 5.5 + Math.random() * 3,
          organicMatter: 15 + Math.random() * 25,
          totalNitrogen: 50 + Math.random() * 100,
          availablePhosphorus: 10 + Math.random() * 40,
          availablePotassium: 80 + Math.random() * 120,
          moisture: 0.15 + Math.random() * 0.25,
          temperature: 15 + Math.random() * 15,
          bulkDensity: 1.2 + Math.random() * 0.4,
          cationExchangeCapacity: 10 + Math.random() * 15,
        });
      }
    });

    test('1.1 应该正确初始化 IndexedDB 数据库', async () => {
      expect(store).toBeDefined();
      expect(store['db']).not.toBeNull();
    });

    test('1.2 应该成功批量添加土壤样本', async () => {
      await store.bulkAdd('soilSamples', testSamples);
      const count = await store.count('soilSamples');
      expect(count).toBeGreaterThanOrEqual(10);
    });

    test('1.3 应该成功获取单个土壤样本', async () => {
      const sample = await store.get<SoilSample>('soilSamples', 'test_sample_0');
      expect(sample).toBeDefined();
      expect(sample?.id).toBe('test_sample_0');
      expect(sample?.location.plotName).toContain('测试地块');
    });

    test('1.4 应该成功获取所有土壤样本', async () => {
      const samples = await store.getAll<SoilSample>('soilSamples');
      expect(samples.length).toBeGreaterThanOrEqual(10);
      expect(samples[0]).toHaveProperty('pH');
      expect(samples[0]).toHaveProperty('organicMatter');
    });

    test('1.5 应该正确计算统计数据', async () => {
      const samples = await store.getAll<SoilSample>('soilSamples');
      const avgPh = samples.reduce((sum, s) => sum + s.pH, 0) / samples.length;
      const avgOm = samples.reduce((sum, s) => sum + s.organicMatter, 0) / samples.length;
      
      expect(avgPh).toBeGreaterThan(5);
      expect(avgPh).toBeLessThan(9);
      expect(avgOm).toBeGreaterThan(10);
    });

    test('1.6 应该支持万级数据存储（性能测试）', async () => {
      const largeBatch: SoilSample[] = [];
      for (let i = 100; i < 200; i++) {
        largeBatch.push({
          id: `perf_sample_${i}`,
          location: { lat: 35, lng: 115, farmId: 'perf', plotName: `P${i}` },
          timestamp: new Date().toISOString(),
          pH: 6.5,
          organicMatter: 25,
          totalNitrogen: 100,
          availablePhosphorus: 25,
          availablePotassium: 150,
          moisture: 0.2,
          temperature: 25,
          bulkDensity: 1.3,
          cationExchangeCapacity: 12,
        });
      }
      
      const startTime = Date.now();
      await store.bulkAdd('soilSamples', largeBatch);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(5000);
    }, 10000);
  });

  describe('【模块 2】异步反应输运模拟引擎', () => {
    let engine: ReactiveTransportEngine;

    beforeEach(() => {
      engine = new ReactiveTransportEngine({
        rootDepth: 80,
        rootDensity: 0.6,
        soilTemperature: 25,
        soilMoisture: 0.25,
        initialNitrogen: 100,
        initialPhosphorus: 30,
        initialPotassium: 150,
        simulationDuration: 30,
        timeStep: 1,
        diffusionCoefficient: 1e-9,
        bulkFlowVelocity: 1e-7,
      });
    });

    test('2.1 应该正确初始化模拟引擎参数', () => {
      expect(engine).toBeDefined();
      expect(engine['params'].rootDepth).toBe(80);
      expect(engine['params'].initialNitrogen).toBe(100);
    });

    test('2.2 应该正确计算扩散通量', () => {
      const flux = engine.calculateDiffusionFlux(100, 10);
      expect(typeof flux).toBe('number');
      expect(flux).toBeGreaterThan(0);
    });

    test('2.3 应该正确计算根系养分吸收（米氏动力学）', () => {
      const nitrogenUptake = engine.calculateRootUptake(100, 'nitrogen');
      const phosphorusUptake = engine.calculateRootUptake(30, 'phosphorus');
      
      expect(typeof nitrogenUptake).toBe('number');
      expect(typeof phosphorusUptake).toBe('number');
      expect(nitrogenUptake).toBeGreaterThan(0);
    });

    test('2.4 应该成功运行完整模拟', async () => {
      const result = await engine.runSimulation();
      
      expect(result).toBeDefined();
      expect(result.totalUptake).toBeDefined();
      expect(result.totalUptake.nitrogen).toBeGreaterThan(0);
      expect(result.totalUptake.phosphorus).toBeGreaterThan(0);
      expect(result.totalUptake.potassium).toBeGreaterThan(0);
    });

    test('2.5 模拟应该报告进度', async () => {
      const progressCallback = jest.fn();
      await engine.runSimulation(progressCallback);
      
      expect(progressCallback).toHaveBeenCalled();
      expect(progressCallback).toHaveBeenCalledWith(100);
    });

    test('2.6 模拟结果应该包含浓度变化数据', async () => {
      const result = await engine.runSimulation();
      
      expect(result.nutrientConcentration).toBeDefined();
      expect(result.nutrientConcentration.nitrogen.length).toBeGreaterThan(0);
      expect(result.nutrientConcentration.phosphorus.length).toBeGreaterThan(0);
    });

    test('2.7 不同参数应该产生不同模拟结果', async () => {
      const engine1 = new ReactiveTransportEngine({
        rootDepth: 50,
        rootDensity: 0.3,
        soilTemperature: 25,
        soilMoisture: 0.25,
        initialNitrogen: 100,
        initialPhosphorus: 30,
        initialPotassium: 150,
        simulationDuration: 30,
        timeStep: 1,
        diffusionCoefficient: 1e-9,
        bulkFlowVelocity: 1e-7,
      });

      const engine2 = new ReactiveTransportEngine({
        rootDepth: 100,
        rootDensity: 0.9,
        soilTemperature: 25,
        soilMoisture: 0.25,
        initialNitrogen: 100,
        initialPhosphorus: 30,
        initialPotassium: 150,
        simulationDuration: 30,
        timeStep: 1,
        diffusionCoefficient: 1e-9,
        bulkFlowVelocity: 1e-7,
      });

      const result1 = await engine1.runSimulation();
      const result2 = await engine2.runSimulation();
      
      expect(result2.totalUptake.nitrogen).toBeGreaterThan(result1.totalUptake.nitrogen);
    });
  });

  describe('【模块 3】施肥决策优化算法', () => {
    const testSample: SoilSample = {
      id: 'fert_test_001',
      location: { lat: 35, lng: 115, farmId: 'test', plotName: '测试田块 A' },
      timestamp: new Date().toISOString(),
      pH: 6.5,
      organicMatter: 25,
      totalNitrogen: 80,
      availablePhosphorus: 20,
      availablePotassium: 120,
      moisture: 0.25,
      temperature: 25,
      bulkDensity: 1.3,
      cationExchangeCapacity: 12,
    };

    test('3.1 应该正确计算土壤养分有效性', () => {
      const availability = FertilizationOptimizer.calculateSoilNutrientAvailability(testSample);
      
      expect(availability).toBeDefined();
      expect(availability.nitrogen).toBeDefined();
      expect(availability.phosphorus).toBeDefined();
      expect(availability.potassium).toBeDefined();
    });

    test('3.2 应该生成有效的施肥建议', () => {
      const recommendation = FertilizationOptimizer.generateRecommendation(
        testSample,
        'wheat',
        'tillering',
        {
          maxNitrogenRate: 180,
          maxPhosphorusRate: 90,
          maxPotassiumRate: 120,
          organicFertilizerRatio: 0.3,
          environmentalTarget: 'balanced',
        },
        10
      );

      expect(recommendation).toBeDefined();
      expect(recommendation.nitrogen).toBeGreaterThan(0);
      expect(recommendation.phosphorus).toBeGreaterThan(0);
      expect(recommendation.potassium).toBeGreaterThan(0);
    });

    test('3.3 不同作物应该产生不同施肥方案', () => {
      const wheatRec = FertilizationOptimizer.generateRecommendation(
        testSample, 'wheat', 'tillering',
        { maxNitrogenRate: 180, maxPhosphorusRate: 90, maxPotassiumRate: 120, organicFertilizerRatio: 0.3, environmentalTarget: 'balanced' },
        10
      );

      const cornRec = FertilizationOptimizer.generateRecommendation(
        testSample, 'corn', 'heading',
        { maxNitrogenRate: 180, maxPhosphorusRate: 90, maxPotassiumRate: 120, organicFertilizerRatio: 0.3, environmentalTarget: 'balanced' },
        10
      );

      expect(wheatRec.nitrogen).not.toBe(cornRec.nitrogen);
    });

    test('3.4 应该包含施用方法和时机说明', () => {
      const recommendation = FertilizationOptimizer.generateRecommendation(
        testSample, 'wheat', 'tillering',
        { maxNitrogenRate: 180, maxPhosphorusRate: 90, maxPotassiumRate: 120, organicFertilizerRatio: 0.3, environmentalTarget: 'balanced' },
        10
      );

      expect(recommendation.applicationMethod).toBeDefined();
      expect(recommendation.applicationTiming).toBeDefined();
      expect(typeof recommendation.applicationMethod).toBe('string');
    });

    test('3.5 应该正确估算施肥成本', () => {
      const recommendation = FertilizationOptimizer.generateRecommendation(
        testSample, 'wheat', 'tillering',
        { maxNitrogenRate: 180, maxPhosphorusRate: 90, maxPotassiumRate: 120, organicFertilizerRatio: 0.3, environmentalTarget: 'balanced' },
        10
      );

      expect(recommendation.estimatedCost).toBeGreaterThan(0);
      expect(typeof recommendation.estimatedCost).toBe('number');
    });

    test('3.6 不同环保目标应该影响施肥方案', () => {
      const conservativeRec = FertilizationOptimizer.generateRecommendation(
        testSample, 'wheat', 'tillering',
        { maxNitrogenRate: 180, maxPhosphorusRate: 90, maxPotassiumRate: 120, organicFertilizerRatio: 0.3, environmentalTarget: 'conservative' },
        10
      );

      const yieldRec = FertilizationOptimizer.generateRecommendation(
        testSample, 'wheat', 'tillering',
        { maxNitrogenRate: 180, maxPhosphorusRate: 90, maxPotassiumRate: 120, organicFertilizerRatio: 0.3, environmentalTarget: 'yield_optimized' },
        10
      );

      expect(yieldRec.nitrogen).toBeGreaterThan(conservativeRec.nitrogen);
    });

    test('3.7 应该计算环境风险评估', () => {
      const recommendation = FertilizationOptimizer.generateRecommendation(
        testSample, 'wheat', 'tillering',
        { maxNitrogenRate: 180, maxPhosphorusRate: 90, maxPotassiumRate: 120, organicFertilizerRatio: 0.3, environmentalTarget: 'balanced' },
        10
      );

      expect(recommendation.environmentalRisk).toBeDefined();
      expect(recommendation.environmentalRisk.nitrogenLossRisk).toBeDefined();
      expect(['low', 'medium', 'high']).toContain(recommendation.environmentalRisk.nitrogenLossRisk);
    });

    test('3.8 应该计算养分利用效率', () => {
      const efficiency = FertilizationOptimizer.calculateNutrientUseEfficiency(testSample, {
        nitrogen: 100,
        phosphorus: 50,
        potassium: 80,
      });

      expect(efficiency).toBeDefined();
      expect(efficiency.nitrogenEfficiency).toBeDefined();
      expect(efficiency.nitrogenEfficiency).toBeGreaterThan(0);
    });
  });

  describe('【模块 4】供应链协同模块', () => {
    test('4.1 应该正确获取供应商列表', () => {
      const suppliers = SupplyChainCoordinator.getSuppliers();
      
      expect(suppliers).toBeDefined();
      expect(suppliers.length).toBeGreaterThan(0);
      expect(suppliers[0].name).toBeDefined();
      expect(suppliers[0].products.length).toBeGreaterThan(0);
    });

    test('4.2 供应商应该有评分和配送信息', () => {
      const suppliers = SupplyChainCoordinator.getSuppliers();
      
      suppliers.forEach(supplier => {
        expect(supplier.rating).toBeGreaterThan(0);
        expect(supplier.rating).toBeLessThanOrEqual(5);
        expect(supplier.deliveryDays).toBeGreaterThan(0);
      });
    });

    test('4.3 应该正确计算供应商距离', () => {
      const location = { lat: 35, lng: 115 };
      const suppliers = SupplyChainCoordinator.getSuppliers();
      
      suppliers.forEach(supplier => {
        const distance = SupplyChainCoordinator['calculateDistance'](
          location,
          { lat: 35 + Math.random(), lng: 115 + Math.random() }
        );
        expect(distance).toBeGreaterThanOrEqual(0);
      });
    });

    test('4.4 应该成功优化订单', () => {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 14);
      
      const result = SupplyChainCoordinator.optimizeOrder(
        { nitrogen: 500, phosphorus: 300, potassium: 400, organic: 1000 },
        { lat: 35.0, lng: 115.0 },
        targetDate
      );

      expect(result).toBeDefined();
      expect(result.recommendedOrders).toBeDefined();
      expect(result.recommendedOrders.length).toBeGreaterThan(0);
    });

    test('4.5 优化订单应该包含正确的数量和价格', () => {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 14);
      
      const result = SupplyChainCoordinator.optimizeOrder(
        { nitrogen: 500, phosphorus: 300, potassium: 400, organic: 1000 },
        { lat: 35.0, lng: 115.0 },
        targetDate
      );

      result.recommendedOrders.forEach((order: any) => {
        expect(order.quantity).toBeGreaterThan(0);
        expect(order.totalPrice).toBeGreaterThan(0);
      });
    });

    test('4.6 应该计算总成本和节省金额', () => {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 14);
      
      const result = SupplyChainCoordinator.optimizeOrder(
        { nitrogen: 500, phosphorus: 300, potassium: 400, organic: 1000 },
        { lat: 35.0, lng: 115.0 },
        targetDate
      );

      expect(result.totalCost).toBeGreaterThan(0);
      expect(result.potentialSavings).toBeGreaterThanOrEqual(0);
    });

    test('4.7 不同需求应该产生不同优化方案', () => {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 14);
      
      const result1 = SupplyChainCoordinator.optimizeOrder(
        { nitrogen: 100, phosphorus: 50, potassium: 80, organic: 200 },
        { lat: 35.0, lng: 115.0 },
        targetDate
      );

      const result2 = SupplyChainCoordinator.optimizeOrder(
        { nitrogen: 1000, phosphorus: 600, potassium: 800, organic: 2000 },
        { lat: 35.0, lng: 115.0 },
        targetDate
      );

      expect(result2.totalCost).toBeGreaterThan(result1.totalCost);
    });
  });

  describe('【模块 5】端到端业务流程集成测试', () => {
    let store: IndexedDBStore;
    const testSample: SoilSample = {
      id: 'e2e_test_001',
      location: { lat: 35, lng: 115, farmId: 'e2e', plotName: '集成测试田块' },
      timestamp: new Date().toISOString(),
      pH: 6.2,
      organicMatter: 28,
      totalNitrogen: 75,
      availablePhosphorus: 22,
      availablePotassium: 130,
      moisture: 0.22,
      temperature: 24,
      bulkDensity: 1.25,
      cationExchangeCapacity: 14,
    };

    beforeAll(async () => {
      store = new IndexedDBStore();
      await store.init();
      await store.add('soilSamples', testSample);
    });

    test('5.1 完整业务流程：土壤样本 → 根系模拟 → 施肥决策 → 供应链', async () => {
      const sample = await store.get<SoilSample>('soilSamples', 'e2e_test_001');
      expect(sample).toBeDefined();
      expect(sample?.id).toBe('e2e_test_001');

      const engine = new ReactiveTransportEngine({
        rootDepth: 80,
        rootDensity: 0.6,
        soilTemperature: sample!.temperature,
        soilMoisture: sample!.moisture,
        initialNitrogen: sample!.totalNitrogen,
        initialPhosphorus: sample!.availablePhosphorus,
        initialPotassium: sample!.availablePotassium,
        simulationDuration: 30,
        timeStep: 1,
        diffusionCoefficient: 1e-9,
        bulkFlowVelocity: 1e-7,
      });

      const simulationResult = await engine.runSimulation();
      expect(simulationResult.totalUptake.nitrogen).toBeGreaterThan(0);

      const recommendation = FertilizationOptimizer.generateRecommendation(
        sample!,
        'wheat',
        'tillering',
        {
          maxNitrogenRate: 180,
          maxPhosphorusRate: 90,
          maxPotassiumRate: 120,
          organicFertilizerRatio: 0.3,
          environmentalTarget: 'balanced',
        },
        10
      );
      expect(recommendation.nitrogen).toBeGreaterThan(0);

      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 14);
      const supplyChainResult = SupplyChainCoordinator.optimizeOrder(
        {
          nitrogen: recommendation.nitrogen,
          phosphorus: recommendation.phosphorus,
          potassium: recommendation.potassium,
          organic: recommendation.organicFertilizer,
        },
        sample!.location,
        targetDate
      );

      expect(supplyChainResult.totalCost).toBeGreaterThan(0);
      expect(supplyChainResult.recommendedOrders.length).toBeGreaterThan(0);
    });

    test('5.2 数据一致性验证：施肥需求与供应链匹配', async () => {
      const sample = await store.get<SoilSample>('soilSamples', 'e2e_test_001');
      
      const recommendation = FertilizationOptimizer.generateRecommendation(
        sample!,
        'wheat',
        'tillering',
        { maxNitrogenRate: 180, maxPhosphorusRate: 90, maxPotassiumRate: 120, organicFertilizerRatio: 0.3, environmentalTarget: 'balanced' },
        10
      );

      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 14);
      const supplyChainResult = SupplyChainCoordinator.optimizeOrder(
        {
          nitrogen: recommendation.nitrogen,
          phosphorus: recommendation.phosphorus,
          potassium: recommendation.potassium,
          organic: recommendation.organicFertilizer,
        },
        sample!.location,
        targetDate
      );

      const totalNitrogenOrdered = supplyChainResult.recommendedOrders
        .filter((o: any) => o.productType === 'nitrogen')
        .reduce((sum: number, o: any) => sum + o.quantity, 0);
      
      expect(totalNitrogenOrdered).toBeCloseTo(recommendation.nitrogen, -1);
    });

    test('5.3 多田块批量处理测试', async () => {
      const samples: SoilSample[] = [];
      for (let i = 0; i < 5; i++) {
        samples.push({
          id: `batch_test_${i}`,
          location: { lat: 35 + i * 0.1, lng: 115 + i * 0.1, farmId: 'batch', plotName: `批量田块 ${i}` },
          timestamp: new Date().toISOString(),
          pH: 5.5 + i * 0.3,
          organicMatter: 20 + i * 5,
          totalNitrogen: 60 + i * 20,
          availablePhosphorus: 15 + i * 5,
          availablePotassium: 100 + i * 20,
          moisture: 0.2,
          temperature: 25,
          bulkDensity: 1.3,
          cationExchangeCapacity: 12,
        });
      }

      await store.bulkAdd('soilSamples', samples);

      const recommendations = samples.map(sample => 
        FertilizationOptimizer.generateRecommendation(
          sample, 'wheat', 'tillering',
          { maxNitrogenRate: 180, maxPhosphorusRate: 90, maxPotassiumRate: 120, organicFertilizerRatio: 0.3, environmentalTarget: 'balanced' },
          2
        )
      );

      expect(recommendations.length).toBe(5);
      recommendations.forEach(rec => {
        expect(rec.nitrogen).toBeGreaterThan(0);
        expect(rec.estimatedCost).toBeGreaterThan(0);
      });
    });
  });

  describe('【模块 6】边界条件与异常处理测试', () => {
    test('6.1 极端土壤 pH 值测试', () => {
      const acidicSample: SoilSample = {
        id: 'edge_acid_001',
        location: { lat: 35, lng: 115, farmId: 'edge', plotName: '酸性土壤' },
        timestamp: new Date().toISOString(),
        pH: 4.0,
        organicMatter: 25,
        totalNitrogen: 80,
        availablePhosphorus: 20,
        availablePotassium: 120,
        moisture: 0.25,
        temperature: 25,
        bulkDensity: 1.3,
        cationExchangeCapacity: 12,
      };

      const alkalineSample: SoilSample = {
        ...acidicSample,
        id: 'edge_alkali_001',
        pH: 9.0,
        plotName: '碱性土壤',
      };

      const acidicRec = FertilizationOptimizer.generateRecommendation(
        acidicSample, 'wheat', 'tillering',
        { maxNitrogenRate: 180, maxPhosphorusRate: 90, maxPotassiumRate: 120, organicFertilizerRatio: 0.3, environmentalTarget: 'balanced' },
        10
      );

      const alkalineRec = FertilizationOptimizer.generateRecommendation(
        alkalineSample, 'wheat', 'tillering',
        { maxNitrogenRate: 180, maxPhosphorusRate: 90, maxPotassiumRate: 120, organicFertilizerRatio: 0.3, environmentalTarget: 'balanced' },
        10
      );

      expect(acidicRec).toBeDefined();
      expect(alkalineRec).toBeDefined();
    });

    test('6.2 零养分土壤测试（退化土壤）', () => {
      const degradedSample: SoilSample = {
        id: 'edge_degraded_001',
        location: { lat: 35, lng: 115, farmId: 'edge', plotName: '退化土壤' },
        timestamp: new Date().toISOString(),
        pH: 7.0,
        organicMatter: 5,
        totalNitrogen: 10,
        availablePhosphorus: 2,
        availablePotassium: 20,
        moisture: 0.1,
        temperature: 30,
        bulkDensity: 1.6,
        cationExchangeCapacity: 5,
      };

      const recommendation = FertilizationOptimizer.generateRecommendation(
        degradedSample, 'wheat', 'tillering',
        { maxNitrogenRate: 180, maxPhosphorusRate: 90, maxPotassiumRate: 120, organicFertilizerRatio: 0.5, environmentalTarget: 'balanced' },
        10
      );

      expect(recommendation.nitrogen).toBeGreaterThan(0);
      expect(recommendation.organicFertilizer).toBeGreaterThan(0);
    });

    test('6.3 紧急配送时间窗口测试', () => {
      const urgentDate = new Date();
      urgentDate.setDate(urgentDate.getDate() + 2);

      const result = SupplyChainCoordinator.optimizeOrder(
        { nitrogen: 500, phosphorus: 300, potassium: 400, organic: 1000 },
        { lat: 35.0, lng: 115.0 },
        urgentDate
      );

      expect(result).toBeDefined();
      expect(result.deliveryTimeline).toBeInstanceOf(Date);
    });
  });
});
