import { FlashoverPredictor, createMockEnvironmentalData } from '@/lib/flashoverPrediction';
import { CombinedFeatures, EnvironmentalData } from '@/types';

describe('FlashoverPredictor - 闪络概率预测算法', () => {
  let predictor: FlashoverPredictor;

  beforeEach(() => {
    predictor = new FlashoverPredictor();
  });

  const createMockFeatures = (thd: number = 0.1, rms: number = 0.5): CombinedFeatures => ({
    timeDomain: {
      peakValue: 1.0,
      rmsValue: rms,
      meanValue: 0,
      variance: 0.1,
      skewness: 0,
      kurtosis: 0,
      pulseCount: 2
    },
    frequencyDomain: {
      fundamentalFrequency: 50,
      harmonicRatios: [0.1, 0.05, 0.03],
      totalHarmonicDistortion: thd,
      peakValue: 0.8,
      rmsValue: 0.5,
      crestFactor: 1.6,
      spectralEntropy: 2.5
    }
  });

  describe('风险等级预测', () => {
    it('应正确预测低风险等级', async () => {
      const features = createMockFeatures(0.05, 0.1);
      const envData: EnvironmentalData = {
        temperature: 20,
        humidity: 30,
        pollutionLevel: 1,
        windSpeed: 5,
        precipitation: 0
      };

      const result = await predictor.predictAsync(features, envData);

      expect(result.riskLevel).toBe('low');
      expect(result.probability).toBeLessThan(0.3);
      expect(isFinite(result.probability)).toBe(true);
    });

    it('应正确预测中风险等级', async () => {
      const features = createMockFeatures(0.2, 0.6);
      const envData: EnvironmentalData = {
        temperature: 25,
        humidity: 60,
        pollutionLevel: 3,
        windSpeed: 3,
        precipitation: 0
      };

      const result = await predictor.predictAsync(features, envData);

      expect(['medium', 'high']).toContain(result.riskLevel);
      expect(isFinite(result.probability)).toBe(true);
    });

    it('应正确预测高风险等级', async () => {
      const features = createMockFeatures(0.4, 1.5);
      const envData: EnvironmentalData = {
        temperature: 30,
        humidity: 85,
        pollutionLevel: 8,
        windSpeed: 1,
        precipitation: 2
      };

      const result = await predictor.predictAsync(features, envData);

      expect(['high', 'critical']).toContain(result.riskLevel);
      expect(result.probability).toBeGreaterThan(0.3);
    });

    it('应正确识别主要影响因素', async () => {
      const features = createMockFeatures(0.4, 1.0);
      const envData: EnvironmentalData = {
        temperature: 25,
        humidity: 70,
        pollutionLevel: 6,
        windSpeed: 2,
        precipitation: 0
      };

      const result = await predictor.predictAsync(features, envData);

      expect(Array.isArray(result.contributingFactors)).toBe(true);
      expect(result.contributingFactors.length).toBeLessThanOrEqual(3);
    });
  });

  describe('归一化函数', () => {
    it('normalizeTHD 应正确处理边界值', () => {
      expect(predictor['normalizeTHD'](0)).toBe(0);
      expect(predictor['normalizeTHD'](0.5)).toBe(1);
      expect(predictor['normalizeTHD'](1.0)).toBe(1);
      expect(predictor['normalizeTHD'](-0.1)).toBe(0);
      expect(predictor['normalizeTHD'](NaN)).toBe(0);
      expect(predictor['normalizeTHD'](Infinity)).toBe(0);
    });

    it('normalizeRMS 应正确处理边界值', () => {
      expect(predictor['normalizeRMS'](0)).toBe(0);
      expect(predictor['normalizeRMS'](2)).toBe(1);
      expect(predictor['normalizeRMS'](3)).toBe(1);
      expect(predictor['normalizeRMS'](-1)).toBe(0);
      expect(predictor['normalizeRMS'](NaN)).toBe(0);
    });

    it('normalizeHarmonicRatios 应正确处理空数组', () => {
      expect(predictor['normalizeHarmonicRatios']([])).toBe(0);
      expect(predictor['normalizeHarmonicRatios']([0.1, 0.2])).toBeGreaterThan(0);
    });

    it('normalizeHumidity 应限制在0-1范围内', () => {
      expect(predictor['normalizeHumidity'](0)).toBe(0);
      expect(predictor['normalizeHumidity'](100)).toBe(1);
      expect(predictor['normalizeHumidity'](150)).toBe(1);
      expect(predictor['normalizeHumidity'](-10)).toBe(0);
    });

    it('normalizePollution 应限制在0-1范围内', () => {
      expect(predictor['normalizePollution'](0)).toBe(0);
      expect(predictor['normalizePollution'](10)).toBe(1);
      expect(predictor['normalizePollution'](15)).toBe(1);
    });
  });

  describe('置信度计算', () => {
    it('应返回有效的置信度值', () => {
      const features = createMockFeatures();
      const confidence = predictor['calculateConfidence'](features);

      expect(confidence).toBeGreaterThanOrEqual(0);
      expect(confidence).toBeLessThanOrEqual(1);
      expect(isFinite(confidence)).toBe(true);
    });

    it('应正确处理无效特征数据', () => {
      const invalidFeatures = {} as CombinedFeatures;
      const confidence = predictor['calculateConfidence'](invalidFeatures);

      expect(isFinite(confidence)).toBe(true);
      expect(confidence).toBeGreaterThanOrEqual(0);
    });
  });

  describe('预测时间计算', () => {
    it('应根据概率返回正确的预测时间', () => {
      expect(predictor['calculatePredictedTime'](0)).toBe(Infinity);
      expect(predictor['calculatePredictedTime'](0.2)).toBe(Infinity);
      expect(predictor['calculatePredictedTime'](0.4)).toBe(24 * 60 * 60 * 1000);
      expect(predictor['calculatePredictedTime'](0.6)).toBe(6 * 60 * 60 * 1000);
      expect(predictor['calculatePredictedTime'](0.9)).toBe(1 * 60 * 60 * 1000);
    });
  });

  describe('批量预测', () => {
    it('predictBatch 应正确处理批量数据', async () => {
      const batch = [
        { features: createMockFeatures(0.1, 0.3), environmentalData: createMockEnvironmentalData() },
        { features: createMockFeatures(0.3, 0.8), environmentalData: createMockEnvironmentalData() },
        { features: createMockFeatures(0.5, 1.2), environmentalData: createMockEnvironmentalData() }
      ];

      const results = await predictor.predictBatch(batch);

      expect(results.length).toBe(3);
      results.forEach(result => {
        expect(result.probability).toBeDefined();
        expect(result.riskLevel).toBeDefined();
        expect(isFinite(result.probability)).toBe(true);
      });
    });
  });

  describe('维护建议生成', () => {
    it('应根据风险等级生成正确的维护建议', () => {
      expect(predictor.generateMaintenanceRecommendation({ probability: 0.1, riskLevel: 'low', confidence: 0.8, predictedTime: Infinity, contributingFactors: [] }))
        .toContain('正常运行');
      
      expect(predictor.generateMaintenanceRecommendation({ probability: 0.4, riskLevel: 'medium', confidence: 0.8, predictedTime: 24 * 60 * 60 * 1000, contributingFactors: [] }))
        .toContain('近期维护');
      
      expect(predictor.generateMaintenanceRecommendation({ probability: 0.6, riskLevel: 'high', confidence: 0.8, predictedTime: 6 * 60 * 60 * 1000, contributingFactors: [] }))
        .toContain('紧急清洗');
      
      expect(predictor.generateMaintenanceRecommendation({ probability: 0.9, riskLevel: 'critical', confidence: 0.8, predictedTime: 60 * 60 * 1000, contributingFactors: [] }))
        .toContain('立即停电检修');
    });
  });

  describe('环境数据生成', () => {
    it('createMockEnvironmentalData 应生成有效数据', () => {
      const data = createMockEnvironmentalData();

      expect(data.temperature).toBeGreaterThanOrEqual(15);
      expect(data.temperature).toBeLessThanOrEqual(35);
      expect(data.humidity).toBeGreaterThanOrEqual(40);
      expect(data.humidity).toBeLessThanOrEqual(80);
      expect(data.pollutionLevel).toBeGreaterThanOrEqual(2);
      expect(data.pollutionLevel).toBeLessThanOrEqual(7);
    });
  });

  describe('边界条件测试', () => {
    it('应正确处理undefined特征数据', async () => {
      const invalidFeatures = {} as CombinedFeatures;
      const envData = createMockEnvironmentalData();

      const result = await predictor.predictAsync(invalidFeatures, envData);

      expect(isFinite(result.probability)).toBe(true);
      expect(result.riskLevel).toBeDefined();
    });

    it('应正确处理NaN输入值', async () => {
      const features: CombinedFeatures = {
        timeDomain: {
          peakValue: NaN,
          rmsValue: NaN,
          meanValue: NaN,
          variance: NaN,
          skewness: NaN,
          kurtosis: NaN,
          pulseCount: 0
        },
        frequencyDomain: {
          fundamentalFrequency: 50,
          harmonicRatios: [],
          totalHarmonicDistortion: NaN,
          peakValue: NaN,
          rmsValue: NaN,
          crestFactor: NaN,
          spectralEntropy: NaN
        }
      };
      const envData = createMockEnvironmentalData();

      const result = await predictor.predictAsync(features, envData);

      expect(isFinite(result.probability)).toBe(true);
    });
  });
});
