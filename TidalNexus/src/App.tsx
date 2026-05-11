import React, { useState, useEffect, useCallback } from 'react';
import { TidalChart } from './components/TidalChart';
import { VectorField } from './components/VectorField';
import { TurbineArray } from './components/TurbineArray';
import { LocationAnalysisCard } from './components/LocationAnalysisCard';
import { useTidalWorker } from './hooks/useTidalWorker';
import { generateSyntheticTidalData, calculatePowerDensity, calculateCapacityFactor, calculateAnnualEnergyProduction } from './utils/tidalMath';
import { 
  initDB, 
  saveHistoricalRecords, 
  tidalDataToHistoricalRecord, 
  locationToId, 
  getRecordCount, 
  saveLocationAnalysis,
  resetAllCache,
  deleteDatabase,
  estimateDatabaseSize,
  clearAllHistoricalRecords
} from './db/tidalDB';
import { GeoLocation, TidalData, ArrayLayout, LocationAnalysis } from './types/tidal';

const App: React.FC = () => {
  const [location, setLocation] = useState<GeoLocation>({
    latitude: 30.0,
    longitude: 120.5,
  });
  const [tidalData, setTidalData] = useState<TidalData[]>([]);
  const [recordCount, setRecordCount] = useState<number>(0);
  const [analysis, setAnalysis] = useState<LocationAnalysis | null>(null);
  const [layout, setLayout] = useState<ArrayLayout | null>(null);
  const [cacheSize, setCacheSize] = useState<{ recordCount: number; estimatedSizeKB: number } | null>(null);
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [showCacheConfirm, setShowCacheConfirm] = useState(false);
  const [clearResult, setClearResult] = useState<{ historicalRecords: number; locationAnalysis: number } | null>(null);
  
  const {
    state: workerState,
    progress,
    result: workerResult,
    optimizeLayout: runOptimizeLayout,
  } = useTidalWorker();

  const updateCacheSize = useCallback(async () => {
    const size = await estimateDatabaseSize();
    setCacheSize(size);
  }, []);

  useEffect(() => {
    initDB();
    generateData();
    updateRecordCount();
    updateCacheSize();
  }, [updateCacheSize]);

  useEffect(() => {
    if (tidalData.length > 0) {
      const results = tidalData.map(d => calculatePowerDensity(d.velocity.magnitude));
      const maxPowerDensity = Math.max(...results);
      const avgPowerDensity = results.reduce((a, b) => a + b, 0) / results.length;
      
      const sampleTurbine = {
        id: 'sample',
        location,
        ratedPower: 1000,
        efficiency: 0.4,
        rotorDiameter: 20,
        cutInSpeed: 0.8,
        cutOutSpeed: 4.5,
      };
      
      const capacityFactor = calculateCapacityFactor(tidalData, sampleTurbine);
      const annualEnergyProduction = calculateAnnualEnergyProduction(tidalData, sampleTurbine);

      const newAnalysis: LocationAnalysis = {
        locationId: locationToId(location),
        location,
        avgPowerDensity,
        maxPowerDensity,
        minPowerDensity: Math.min(...results),
        capacityFactor,
        annualEnergyProduction,
      };

      setAnalysis(newAnalysis);
      saveLocationAnalysis(newAnalysis);
    }
  }, [tidalData, location]);

  useEffect(() => {
    if (workerResult && workerState === 'completed') {
      const result = workerResult as { bestLayout?: ArrayLayout };
      if (result.bestLayout) {
        setLayout(result.bestLayout);
      }
    }
  }, [workerResult, workerState]);

  const generateData = () => {
    const data = generateSyntheticTidalData(location, Date.now(), 72, 10);
    setTidalData(data);
    
    const records = data.map(d => tidalDataToHistoricalRecord(d, location));
    saveHistoricalRecords(records).then(() => {
      updateRecordCount();
      updateCacheSize();
    });
  };

  const updateRecordCount = async () => {
    const count = await getRecordCount();
    setRecordCount(count);
  };

  const handleResetCache = async () => {
    setIsClearingCache(true);
    setClearResult(null);
    
    try {
      const result = await resetAllCache();
      setClearResult(result);
      await updateRecordCount();
      await updateCacheSize();
      setAnalysis(null);
    } catch (error) {
      console.error('Failed to reset cache:', error);
    } finally {
      setIsClearingCache(false);
      setShowCacheConfirm(false);
    }
  };

  const handleClearHistoricalOnly = async () => {
    setIsClearingCache(true);
    setClearResult(null);
    
    try {
      const count = await clearAllHistoricalRecords();
      setClearResult({ historicalRecords: count, locationAnalysis: 0 });
      await updateRecordCount();
      await updateCacheSize();
    } catch (error) {
      console.error('Failed to clear historical records:', error);
    } finally {
      setIsClearingCache(false);
      setShowCacheConfirm(false);
    }
  };

  const handleDeleteDatabase = async () => {
    if (window.confirm('⚠️ 警告：此操作将完全删除数据库，无法恢复！确定要继续吗？')) {
      setIsClearingCache(true);
      try {
        await deleteDatabase();
        setRecordCount(0);
        setCacheSize(null);
        setAnalysis(null);
        setClearResult({ historicalRecords: -1, locationAnalysis: -1 });
        await initDB();
      } catch (error) {
        console.error('Failed to delete database:', error);
      } finally {
        setIsClearingCache(false);
        setShowCacheConfirm(false);
      }
    }
  };

  const handleOptimizeLayout = () => {
    runOptimizeLayout({
      siteLocation: location,
      tidalData,
      turbineCount: 16,
      constraints: {
        minSpacing: 100,
        areaBounds: {
          width: 1000,
          height: 800,
        },
      },
    });
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">TidalNexus</h1>
              <p className="text-blue-200 mt-1">潮流能发电阵列布局优化系统</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-blue-200">IndexedDB 缓存记录</div>
              <div className="text-2xl font-bold">{recordCount}</div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-4 mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">站点位置设置</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    纬度 (°N)
                  </label>
                  <input
                    type="number"
                    value={location.latitude}
                    onChange={(e) =>
                      setLocation({ ...location, latitude: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    step="0.0001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    经度 (°E)
                  </label>
                  <input
                    type="number"
                    value={location.longitude}
                    onChange={(e) =>
                      setLocation({ ...location, longitude: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    step="0.0001"
                  />
                </div>
              </div>
              <button
                onClick={generateData}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                重新生成潮流数据
              </button>
            </div>

            {tidalData.length > 0 && <TidalChart data={tidalData} />}

            <div className="mt-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">阵列布局优化</h2>
              <button
                onClick={handleOptimizeLayout}
                disabled={workerState === 'processing'}
                className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {workerState === 'processing'
                  ? `优化中... ${(progress * 100).toFixed(0)}%`
                  : '开始优化阵列布局'}
              </button>
              {layout && <div className="mt-4"><TurbineArray layout={layout} /></div>}
            </div>
          </div>

          <div className="space-y-6">
            {analysis && <LocationAnalysisCard analysis={analysis} />}
            
            {tidalData.length > 0 && (
              <VectorField
                tidalData={tidalData}
                centerLocation={location}
                width={350}
                height={300}
              />
            )}

            <div className="bg-white rounded-lg shadow-md p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">系统状态</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">数据点数</span>
                  <span className="font-medium">{tidalData.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">计算引擎</span>
                  <span className="font-medium">Web Worker</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">缓存引擎</span>
                  <span className="font-medium">IndexedDB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">工作状态</span>
                  <span className={`font-medium ${
                    workerState === 'processing' ? 'text-yellow-600' :
                    workerState === 'completed' ? 'text-green-600' :
                    workerState === 'error' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {workerState === 'idle' ? '空闲' :
                     workerState === 'processing' ? '计算中' :
                     workerState === 'completed' ? '完成' :
                     workerState === 'error' ? '错误' : workerState}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">缓存管理</h3>
              
              {cacheSize && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <div className="text-sm text-blue-800">
                    <div className="flex justify-between mb-1">
                      <span>总记录数</span>
                      <span className="font-semibold">{cacheSize.recordCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>预估体积</span>
                      <span className="font-semibold">{cacheSize.estimatedSizeKB} KB</span>
                    </div>
                  </div>
                </div>
              )}

              {clearResult && (
                <div className="mb-4 p-3 bg-green-50 rounded-lg text-sm text-green-800">
                  {clearResult.historicalRecords === -1 ? (
                    <span>✅ 数据库已完全删除并重新初始化</span>
                  ) : (
                    <span>✅ 清理完成：历史记录 {clearResult.historicalRecords} 条，分析数据 {clearResult.locationAnalysis} 条</span>
                  )}
                </div>
              )}

              {!showCacheConfirm ? (
                <div className="space-y-2">
                  <button
                    onClick={() => setShowCacheConfirm(true)}
                    disabled={isClearingCache}
                    className="w-full px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    {isClearingCache ? '清理中...' : '🔧 缓存清理选项'}
                  </button>
                  <button
                    onClick={updateCacheSize}
                    className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm"
                  >
                    🔄 刷新缓存统计
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-sm text-gray-600 mb-2">
                    请选择清理方式：
                  </div>
                  
                  <button
                    onClick={handleClearHistoricalOnly}
                    disabled={isClearingCache}
                    className="w-full px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
                  >
                    📊 仅清理历史潮位记录
                  </button>
                  
                  <button
                    onClick={handleResetCache}
                    disabled={isClearingCache}
                    className="w-full px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
                  >
                    🗑️ 重置所有缓存数据
                  </button>
                  
                  <button
                    onClick={handleDeleteDatabase}
                    disabled={isClearingCache}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
                  >
                    ⚠️ 完全删除数据库
                  </button>
                  
                  <button
                    onClick={() => setShowCacheConfirm(false)}
                    disabled={isClearingCache}
                    className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
                  >
                    取消
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-gray-800 text-white py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-400">
          TidalNexus - 基于 React 的潮流能发电阵列布局优化系统 | Web Worker 异步计算 | IndexedDB 数据缓存
        </div>
      </footer>
    </div>
  );
};

export default App;