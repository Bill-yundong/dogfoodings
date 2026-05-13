import { FrequencyAnalyzer, createLeakageCurrentData } from '@/lib/frequencyAnalysis';
import { LeakageCurrentData } from '@/types';

describe('FrequencyAnalyzer - 泄露电流频域分析算法', () => {
  let analyzer: FrequencyAnalyzer;

  beforeEach(() => {
    analyzer = new FrequencyAnalyzer(1000);
  });

  describe('时域特征提取', () => {
    it('应正确处理空信号', () => {
      const signal: number[] = [];
      const features = analyzer['extractTimeDomainFeatures'](signal);
      
      expect(features.peakValue).toBe(0);
      expect(features.rmsValue).toBe(0);
      expect(features.meanValue).toBe(0);
      expect(features.variance).toBe(0);
    });

    it('应正确计算正弦信号的有效值', () => {
      const signal: number[] = [];
      for (let i = 0; i < 100; i++) {
        signal.push(Math.sin(2 * Math.PI * 50 * i / 1000));
      }
      const features = analyzer['extractTimeDomainFeatures'](signal);
      
      expect(features.rmsValue).toBeGreaterThan(0.6);
      expect(features.rmsValue).toBeLessThan(0.8);
      expect(isFinite(features.rmsValue)).toBe(true);
    });

    it('应正确检测脉冲计数', () => {
      const signal = [0, 0.1, 0, 2, 0, 0.5, 0, 3, 0];
      const features = analyzer['extractTimeDomainFeatures'](signal);
      
      expect(features.pulseCount).toBeGreaterThan(0);
    });

    it('应正确处理标准差为零的情况', () => {
      const signal = [1, 1, 1, 1, 1];
      const features = analyzer['extractTimeDomainFeatures'](signal);
      
      expect(features.skewness).toBe(0);
      expect(features.kurtosis).toBe(0);
    });
  });

  describe('频域特征提取', () => {
    it('应正确处理零长度信号', () => {
      const signal: number[] = [];
      const features = analyzer['extractFrequencyDomainFeatures'](signal);
      
      expect(isFinite(features.totalHarmonicDistortion)).toBe(true);
      expect(isFinite(features.rmsValue)).toBe(true);
    });

    it('应正确提取50Hz基频特征', () => {
      const signal: number[] = [];
      for (let i = 0; i < 1024; i++) {
        signal.push(Math.sin(2 * Math.PI * 50 * i / 1000));
      }
      const features = analyzer['extractFrequencyDomainFeatures'](signal);
      
      expect(features.fundamentalFrequency).toBe(50);
      expect(isFinite(features.totalHarmonicDistortion)).toBe(true);
    });

    it('FFT 应正确处理任意长度信号', () => {
      const signal: number[] = [];
      for (let i = 0; i < 100; i++) {
        signal.push(Math.sin(2 * Math.PI * 50 * i / 1000));
      }
      const result = analyzer['performFFT'](signal);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      result.forEach(val => {
        expect(isFinite(val.real)).toBe(true);
        expect(isFinite(val.imag)).toBe(true);
      });
    });

    it('padToPowerOfTwo 应正确补零到2的幂', () => {
      const signal = new Array(100).fill(0);
      const padded = analyzer['padToPowerOfTwo'](signal);
      
      expect(padded.length).toBe(128);
      expect(padded.filter(v => v === 0).length).toBeGreaterThan(0);
    });
  });

  describe('异步分析接口', () => {
    it('analyzeAsync 应返回有效的特征数据', async () => {
      const data: LeakageCurrentData = {
        id: 'test-001',
        insulatorId: 'ins-001',
        timestamp: Date.now(),
        rawData: Array.from({ length: 1024 }, (_, i) => Math.sin(2 * Math.PI * 50 * i / 1000)),
        samplingRate: 1000
      };

      const result = await analyzer.analyzeAsync(data);
      
      expect(result.timeDomain).toBeDefined();
      expect(result.frequencyDomain).toBeDefined();
      expect(isFinite(result.timeDomain.rmsValue)).toBe(true);
      expect(isFinite(result.frequencyDomain.totalHarmonicDistortion)).toBe(true);
    });

    it('analyzeBatch 应批量处理多个数据', async () => {
      const batchData: LeakageCurrentData[] = [];
      for (let i = 0; i < 3; i++) {
        batchData.push({
          id: `test-${i}`,
          insulatorId: `ins-${i}`,
          timestamp: Date.now(),
          rawData: Array.from({ length: 256 }, (_, j) => Math.sin(2 * Math.PI * 50 * j / 1000)),
          samplingRate: 1000
        });
      }

      const results = await analyzer.analyzeBatch(batchData);
      
      expect(results.size).toBe(3);
      results.forEach((features, id) => {
        expect(features.timeDomain).toBeDefined();
        expect(features.frequencyDomain).toBeDefined();
      });
    });
  });

  describe('测试数据生成', () => {
    it('createLeakageCurrentData 应生成有效数据', () => {
      const data = createLeakageCurrentData('ins-001', 1, 1000);
      
      expect(data.id).toBeDefined();
      expect(data.insulatorId).toBe('ins-001');
      expect(data.rawData.length).toBe(1000);
      expect(data.samplingRate).toBe(1000);
      data.rawData.forEach(val => {
        expect(isFinite(val)).toBe(true);
      });
    });
  });

  describe('边界条件测试', () => {
    it('应正确处理NaN值', () => {
      const signal = [1, 2, NaN, 4, 5];
      const features = analyzer['extractTimeDomainFeatures'](signal);
      
      expect(isFinite(features.rmsValue)).toBe(true);
    });

    it('应正确处理全零信号', () => {
      const signal = new Array(100).fill(0);
      const features = analyzer['extractTimeDomainFeatures'](signal);
      
      expect(features.peakValue).toBe(0);
      expect(features.rmsValue).toBe(0);
    });

    it('FFT应正确处理长度为1的信号', () => {
      const signal = [1];
      const result = analyzer['performFFT'](signal);
      
      expect(result.length).toBe(1);
      expect(result[0].real).toBe(1);
      expect(result[0].imag).toBe(0);
    });
  });
});
